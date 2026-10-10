import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiContext } from "../api/context";
import { createMemoryApi } from "../api/memory";
import type { Api } from "../api/types";
import { NotizenView } from "./NotizenView";

// Der echte Editor wird separat getestet; hier steht ein schlichtes Textfeld an seiner Stelle.
vi.mock("../notes/NoteEditor", () => ({
  default: (props: {
    content: string;
    onChange: (content: string, plainText: string) => void;
    onCreateTask: (text: string, target: "Heute" | "Inbox") => void;
  }) => (
    <div>
      <textarea
        aria-label="Notizinhalt"
        defaultValue={props.content ? (JSON.parse(props.content) as { text: string }).text : ""}
        onChange={(e) =>
          props.onChange(JSON.stringify({ type: "doc", text: e.target.value }), e.target.value)
        }
      />
      <button type="button" onClick={() => props.onCreateTask("Folien senden", "Heute")}>
        Testaufgabe für Heute
      </button>
    </div>
  ),
}));

function Host({ initial = null }: { initial?: string | null }) {
  const [id, setId] = useState<string | null>(initial);
  return <NotizenView noteId={id} onSelect={setId} />;
}

function setup(api: Api = createMemoryApi(), initial: string | null = null) {
  render(
    <ApiContext.Provider value={api}>
      <Host initial={initial} />
    </ApiContext.Provider>,
  );
  return api;
}

const listPane = () => screen.getByRole("complementary", { name: "Notizliste" });

beforeEach(() => {
  window.localStorage.clear();
  delete document.documentElement.dataset.typing;
});

describe("NotizenView", () => {
  it("zeigt den leeren Zustand und legt eine neue Notiz an", async () => {
    const user = userEvent.setup();
    const api = setup();
    expect(await screen.findByText("Noch keine Notizen. Lege die erste an.")).toBeInTheDocument();
    expect(screen.getByText("Wähle eine Notiz oder lege eine neue an.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "+ Neue Notiz" }));
    expect(await screen.findByLabelText("Notizinhalt")).toBeInTheDocument();
    expect(await api.listNotes()).toHaveLength(1);
    expect(within(listPane()).getByRole("button", { name: /^Neue Notiz/ })).toHaveAttribute(
      "aria-current",
      "true",
    );
  });

  it("speichert Titel und Text automatisch und aktualisiert die Liste", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const note = await api.createNote();
    setup(api, note.id);

    await user.type(await screen.findByLabelText("Titel"), "Quartalsplanung");
    await user.type(screen.getByLabelText("Notizinhalt"), "Budget klären");

    await waitFor(async () => expect((await api.getNote(note.id)).plainText).toBe("Budget klären"), {
      timeout: 3000,
    });
    expect((await api.getNote(note.id)).title).toBe("Quartalsplanung");
    expect(await within(listPane()).findByText("Quartalsplanung")).toBeInTheDocument();
    expect(await screen.findByText("Lokal gespeichert")).toBeInTheDocument();
  });

  it("speichert ungespeicherte Eingaben beim Wechsel zu einer anderen Notiz", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const a = await api.createNote("Erste");
    await api.createNote("Zweite");
    setup(api, a.id);

    await user.type(await screen.findByLabelText("Notizinhalt"), "Schnell getippt");
    await user.click(within(listPane()).getByRole("button", { name: /Zweite/ }));

    await waitFor(async () => expect((await api.getNote(a.id)).plainText).toBe("Schnell getippt"));
  });

  it("heftet Notizen an und zeigt sie in einer eigenen Gruppe zuerst", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const a = await api.createNote("Alt");
    await new Promise((r) => setTimeout(r, 3));
    await api.createNote("Neu");
    setup(api, a.id);

    expect(within(listPane()).queryByText("Angeheftet")).not.toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "☆ Anheften" }));
    expect(await within(listPane()).findByText("Angeheftet")).toBeInTheDocument();
    const items = within(listPane())
      .getAllByRole("listitem")
      .map((li) => li.textContent);
    expect(items).toEqual(["★ Alt", "Neu"]);
    expect(await screen.findByRole("button", { name: "★ Angeheftet" })).toBeInTheDocument();
  });

  it("durchsucht Titel und Inhalt", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const a = await api.createNote("Quartalsplanung");
    const b = await api.createNote("Idee");
    await api.updateNote(b.id, { plainText: "Newsletter starten" });
    setup(api);

    expect(await within(listPane()).findByText("Quartalsplanung")).toBeInTheDocument();
    await user.type(screen.getByLabelText("Notizen durchsuchen"), "newsletter");
    await waitFor(() => expect(within(listPane()).queryByText("Quartalsplanung")).not.toBeInTheDocument());
    expect(within(listPane()).getByText("Idee")).toBeInTheDocument();

    await user.clear(screen.getByLabelText("Notizen durchsuchen"));
    await user.type(screen.getByLabelText("Notizen durchsuchen"), "gibt es nicht");
    expect(await screen.findByText("Keine Treffer.")).toBeInTheDocument();
    expect(a.id).not.toBe(b.id);
  });

  it("loescht eine Notiz und stellt sie mit Rückgängig wieder her", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const note = await api.createNote("Weg damit");
    setup(api, note.id);

    await user.click(await screen.findByRole("button", { name: "Löschen" }));
    expect(await screen.findByRole("status")).toHaveTextContent("Notiz gelöscht");
    expect(await api.listNotes()).toHaveLength(0);
    expect(screen.getByText("Wähle eine Notiz oder lege eine neue an.")).toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Rückgängig" }));
    expect(await screen.findByLabelText("Titel")).toHaveValue("Weg damit");
    expect(await api.listNotes()).toHaveLength(1);
  });

  it("legt aus einer Notiz eine verknuepfte Aufgabe an und zeigt sie unter der Notiz", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const note = await api.createNote("Meeting");
    setup(api, note.id);

    await user.click(await screen.findByRole("button", { name: "Testaufgabe für Heute" }));
    const linked = await screen.findByRole("region", { name: "Verknüpfte Aufgaben" });
    expect(await within(linked).findByText("Folien senden")).toBeInTheDocument();
    expect(within(linked).queryByRole("button", { name: /Notiz zu/ })).not.toBeInTheDocument();
    expect((await api.listTasks())[0]).toMatchObject({ noteId: note.id, categoryId: "Heute" });

    await user.click(within(linked).getByRole("checkbox", { name: "Folien senden erledigen" }));
    await waitFor(async () => expect((await api.listTasks())[0]?.categoryId).toBe("Erledigt"));
  });

  it("meldet Speicherfehler dauerhaft, ohne den Text zu verlieren", async () => {
    const user = userEvent.setup();
    const base = createMemoryApi();
    const note = await base.createNote();
    setup({ ...base, updateNote: () => Promise.reject(new Error("Datenbank gesperrt")) }, note.id);

    await user.type(await screen.findByLabelText("Notizinhalt"), "Wichtig");
    expect(await screen.findByRole("alert", {}, { timeout: 3000 })).toHaveTextContent("Datenbank gesperrt");
    expect(screen.getByLabelText("Notizinhalt")).toHaveValue("Wichtig");
  });

  it("meldet, wenn eine Notiz nicht geladen werden kann", async () => {
    setup(createMemoryApi(), "gibt-es-nicht");
    expect(await screen.findByRole("alert")).toHaveTextContent("Notiz konnte nicht geladen werden");
  });
});

describe("Schreibfokus", () => {
  const typing = () => document.documentElement.dataset.typing;

  it("blendet beim Tippen Menüs aus und zeigt sie bei Mausbewegung wieder", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const note = await api.createNote();
    setup(api, note.id);

    await user.type(await screen.findByLabelText("Titel"), "A");
    expect(typing()).toBe("true");
    fireEvent.mouseMove(document, { clientX: 10, clientY: 10 });
    expect(typing()).toBeUndefined();
  });

  it("ignoriert kleines Zittern der Maus und reagiert auf echte Bewegung oder Klick", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const note = await api.createNote();
    setup(api, note.id);

    await user.click(await screen.findByLabelText("Titel"));
    fireEvent.mouseMove(document, { clientX: 100, clientY: 100 });
    await user.keyboard("A");
    expect(typing()).toBe("true");
    fireEvent.mouseMove(document, { clientX: 101, clientY: 101 });
    expect(typing()).toBe("true");
    fireEvent.mouseMove(document, { clientX: 130, clientY: 120 });
    expect(typing()).toBeUndefined();

    await user.keyboard("B");
    expect(typing()).toBe("true");
    await user.click(screen.getByLabelText("Titel"));
    expect(typing()).toBeUndefined();
  });

  it("wird nur beim Schreiben in der Notiz ausgelöst, nicht bei Suche, Pfeil- oder Tastenkürzeln", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const note = await api.createNote("Eine Notiz");
    setup(api, note.id);

    await user.type(await screen.findByLabelText("Notizen durchsuchen"), "abc");
    expect(typing()).toBeUndefined();

    await user.click(screen.getByLabelText("Titel"));
    await user.keyboard("{ArrowLeft}{Control>}c{/Control}{Shift}");
    expect(typing()).toBeUndefined();

    await user.keyboard("{Backspace}");
    expect(typing()).toBe("true");
  });

  it("endet beim Verlassen der Notizen-Ansicht", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const note = await api.createNote();
    const { unmount } = render(
      <ApiContext.Provider value={api}>
        <Host initial={note.id} />
      </ApiContext.Provider>,
    );
    await user.type(await screen.findByLabelText("Titel"), "A");
    expect(typing()).toBe("true");
    unmount();
    expect(typing()).toBeUndefined();
  });
});

describe("Tab-Leiste", () => {
  const tabs = () => screen.getAllByRole("tab").map((t) => t.textContent);

  it("hat den festen Startpunkt „Notizen“ und öffnet Notizen aus der Liste als Tabs", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    await api.createNote("Erste");
    await api.createNote("Zweite");
    setup(api);

    expect(await screen.findByRole("tab", { name: "Notizen" })).toHaveAttribute("aria-selected", "true");
    expect(tabs()).toEqual(["Notizen"]);

    await user.click(await within(listPane()).findByRole("button", { name: /Erste/ }));
    await user.click(within(listPane()).getByRole("button", { name: /Zweite/ }));
    expect(tabs()).toEqual(["Notizen", "Erste", "Zweite"]);
    expect(screen.getByRole("tab", { name: "Zweite" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByLabelText("Titel")).toHaveValue("Zweite");
  });

  it("wechselt per Klick zwischen Tabs, ohne ungespeicherten Text zu verlieren", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const a = await api.createNote("Erste");
    await api.createNote("Zweite");
    setup(api, a.id);

    await user.type(await screen.findByLabelText("Notizinhalt"), "Gedanke");
    await user.click(await within(listPane()).findByRole("button", { name: /Zweite/ }));
    expect(screen.getByLabelText("Titel")).toHaveValue("Zweite");

    await user.click(screen.getByRole("tab", { name: "Erste" }));
    expect(await screen.findByLabelText("Titel")).toHaveValue("Erste");
    await waitFor(async () => expect((await api.getNote(a.id)).plainText).toBe("Gedanke"));
  });

  it("schließt Tabs; der vorherige wird aktiv, zuletzt der Startpunkt", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    await api.createNote("Erste");
    await api.createNote("Zweite");
    setup(api);
    await user.click(await within(listPane()).findByRole("button", { name: /Erste/ }));
    await user.click(within(listPane()).getByRole("button", { name: /Zweite/ }));

    await user.click(screen.getByRole("button", { name: "Zweite schließen" }));
    expect(tabs()).toEqual(["Notizen", "Erste"]);
    expect(screen.getByRole("tab", { name: "Erste" })).toHaveAttribute("aria-selected", "true");

    await user.click(screen.getByRole("button", { name: "Erste schließen" }));
    expect(tabs()).toEqual(["Notizen"]);
    expect(screen.getByRole("tab", { name: "Notizen" })).toHaveAttribute("aria-selected", "true");
    expect(screen.getByText("Wähle eine Notiz oder lege eine neue an.")).toBeInTheDocument();
  });

  it("legt über + eine neue Notiz in einem neuen Tab an", async () => {
    const user = userEvent.setup();
    const api = setup();
    await user.click(await screen.findByRole("button", { name: "Neue Notiz im neuen Tab" }));
    expect(await screen.findByRole("tab", { name: "Neue Notiz" })).toHaveAttribute("aria-selected", "true");
    expect(await api.listNotes()).toHaveLength(1);
  });

  it("merkt sich geöffnete Tabs und entfernt gelöschte Notizen", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const a = await api.createNote("Erste");
    const b = await api.createNote("Zweite");
    window.localStorage.setItem("workflow-open-notes", JSON.stringify([a.id, b.id, "gibt-es-nicht"]));
    setup(api);

    await waitFor(() => expect(tabs()).toEqual(["Notizen", "Erste", "Zweite"]));
    await user.click(screen.getByRole("tab", { name: "Erste" }));
    await user.click(await screen.findByRole("button", { name: "Löschen" }));
    await waitFor(() => expect(tabs()).toEqual(["Notizen", "Zweite"]));
    await waitFor(() =>
      expect(JSON.parse(window.localStorage.getItem("workflow-open-notes") ?? "[]")).toEqual([b.id]),
    );

    await user.click(screen.getByRole("button", { name: "Rückgängig" }));
    await waitFor(() => expect(tabs()).toContain("Erste"));
  });

  it("öffnet eine von außen gewählte Notiz (z. B. aus einer Aufgabe) als Tab", async () => {
    const api = createMemoryApi();
    const note = await api.createNote("Aus Aufgabe");
    setup(api, note.id);
    expect(await screen.findByRole("tab", { name: "Aus Aufgabe" })).toHaveAttribute("aria-selected", "true");
  });

  it("blendet die Tab-Leiste beim Schreiben aus (Schreibfokus)", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const note = await api.createNote();
    setup(api, note.id);
    await user.type(await screen.findByLabelText("Titel"), "A");
    expect(document.documentElement.dataset.typing).toBe("true");
    expect(screen.getByRole("tablist")).toBeInTheDocument();
  });
});
