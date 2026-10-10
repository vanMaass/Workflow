import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiContext } from "../api/context";
import { createMemoryApi } from "../api/memory";
import type { Api } from "../api/types";
import { toDateString } from "../lib/date";
import { HeuteView } from "./HeuteView";

// Der echte Editor wird separat getestet; hier steht ein schlichtes Textfeld an seiner Stelle.
vi.mock("../notes/NoteEditor", () => ({
  default: (props: { content: string; onChange: (content: string, plainText: string) => void }) => (
    <textarea
      aria-label="Notizinhalt"
      defaultValue={props.content ? (JSON.parse(props.content) as { text: string }).text : ""}
      onChange={(e) => props.onChange(JSON.stringify({ type: "doc", text: e.target.value }), e.target.value)}
    />
  ),
}));

const today = toDateString(new Date());

function setup(api: Api = createMemoryApi()) {
  render(
    <ApiContext.Provider value={api}>
      <HeuteView />
    </ApiContext.Provider>,
  );
  return api;
}

describe("HeuteView", () => {
  it("startet leer mit Fokusfeld und Schnellnotiz", async () => {
    setup();
    expect(await screen.findByLabelText("Was ist heute wichtig?")).toBeInTheDocument();
    expect(screen.getByLabelText("Schnellnotiz")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Offen von gestern/ })).not.toBeInTheDocument();
  });

  it("legt eine Aufgabe an und hakt sie ab", async () => {
    const user = userEvent.setup();
    setup();
    await user.type(await screen.findByLabelText("Aufgabe hinzufügen"), "Mail schreiben{Enter}");
    const box = await screen.findByRole("checkbox", { name: "Mail schreiben erledigen" });
    expect(box).not.toBeChecked();
    await user.click(box);
    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Mail schreiben erledigen" })).toBeChecked(),
    );

    await user.click(screen.getByRole("checkbox", { name: "Mail schreiben erledigen" }));
    await waitFor(() =>
      expect(screen.getByRole("checkbox", { name: "Mail schreiben erledigen" })).not.toBeChecked(),
    );
  });

  it("uebernimmt Aufgaben von gestern erst auf Klick", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const yesterday = toDateString(new Date(Date.now() - 24 * 3600 * 1000));
    await api.createTask({ title: "Liegengeblieben", categoryId: "Heute", date: yesterday });
    setup(api);

    expect(await screen.findByRole("button", { name: /Offen von gestern/ })).toBeInTheDocument();
    expect((await api.getToday(today)).tasks).toHaveLength(0);

    await user.click(screen.getByRole("button", { name: "Liegengeblieben nach heute uebernehmen" }));
    await waitFor(() =>
      expect(screen.queryByRole("button", { name: /Offen von gestern/ })).not.toBeInTheDocument(),
    );
    expect((await api.getToday(today)).tasks).toHaveLength(1);
  });

  it("zeigt sieben Aufgaben und den Hinweis auf weitere", async () => {
    const api = createMemoryApi();
    for (let i = 1; i <= 9; i++)
      await api.createTask({ title: `Aufgabe ${i}`, categoryId: "Heute", date: today });
    setup(api);
    expect(await screen.findByText("Weitere Aufgaben anzeigen (2)")).toBeInTheDocument();
    expect(screen.queryByText("Aufgabe 8")).not.toBeInTheDocument();
  });

  it("meldet Speicherfehler sichtbar", async () => {
    const user = userEvent.setup();
    const api: Api = {
      ...createMemoryApi(),
      createTask: () => Promise.reject(new Error("Datenbank gesperrt")),
    };
    setup(api);
    await user.type(await screen.findByLabelText("Aufgabe hinzufügen"), "X{Enter}");
    expect(await screen.findByRole("alert")).toHaveTextContent("Datenbank gesperrt");
  });
});

describe("Tagesfokus", () => {
  it("wird hervorgehoben, sobald ein Fokus eingetragen ist", async () => {
    const user = userEvent.setup();
    setup();
    const input = await screen.findByLabelText("Was ist heute wichtig?");
    const card = input.closest("section");
    expect(card).toHaveAttribute("data-filled", "false");

    await user.type(input, "Angebot fertigstellen");
    expect(card).toHaveAttribute("data-filled", "true");

    await user.clear(input);
    expect(card).toHaveAttribute("data-filled", "false");
  });

  it("ist beim Start hervorgehoben, wenn der Fokus schon gespeichert ist", async () => {
    const api = createMemoryApi();
    await api.updateDailyPlan(today, { focus: "Release" });
    setup(api);
    const input = await screen.findByLabelText("Was ist heute wichtig?");
    expect(input).toHaveValue("Release");
    expect(input.closest("section")).toHaveAttribute("data-filled", "true");
  });
});

describe("Offen von gestern einklappen", () => {
  beforeEach(() => window.localStorage.clear());

  it("klappt die Liste ein und aus und merkt sich den Zustand", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const yesterday = toDateString(new Date(Date.now() - 24 * 3600 * 1000));
    await api.createTask({ title: "Alt A", categoryId: "Heute", date: yesterday });
    await api.createTask({ title: "Alt B", categoryId: "Heute", date: yesterday });
    setup(api);

    const toggle = await screen.findByRole("button", { name: /Offen von gestern 2/ });
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByText("Alt A")).toBeVisible();

    await user.click(toggle);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(screen.getByText("Alt A")).not.toBeVisible();
    expect(window.localStorage.getItem("workflow-carryover-collapsed")).toBe("true");

    await user.click(toggle);
    expect(screen.getByText("Alt A")).toBeVisible();
  });

  it("startet eingeklappt, wenn der Nutzer es so zuletzt gelassen hat", async () => {
    window.localStorage.setItem("workflow-carryover-collapsed", "true");
    const api = createMemoryApi();
    const yesterday = toDateString(new Date(Date.now() - 24 * 3600 * 1000));
    await api.createTask({ title: "Alt A", categoryId: "Heute", date: yesterday });
    setup(api);
    expect(await screen.findByRole("button", { name: /Offen von gestern 1/ })).toHaveAttribute(
      "aria-expanded",
      "false",
    );
    expect(screen.getByText("Alt A")).not.toBeVisible();
  });
});

describe("Schnellnotiz und Arbeitsnotiz", () => {
  beforeEach(() => window.localStorage.clear());

  it("ist an jedem Tag neu und leer", async () => {
    const api = createMemoryApi();
    const yesterday = toDateString(new Date(Date.now() - 24 * 3600 * 1000));
    await api.updateDailyPlan(yesterday, { note: "Notiz von gestern" });
    setup(api);
    expect(await screen.findByLabelText("Schnellnotiz")).toHaveValue("");
  });

  it("öffnet zur Auswahl ein Popup mit vorhandenen Notizen und zeigt die gewählte", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const note = await api.createNote("Quartalsplanung");
    await api.updateNote(note.id, {
      content: JSON.stringify({ type: "doc", text: "Budget klären" }),
      plainText: "Budget klären",
    });
    setup(api);

    const trigger = await screen.findByRole("button", { name: "Arbeitsnotiz wählen: Schnellnotiz (heute)" });
    expect(screen.queryByRole("listbox", { name: "Notizen" })).not.toBeInTheDocument();
    await user.click(trigger);

    const list = await screen.findByRole("listbox", { name: "Notizen" });
    await waitFor(() =>
      expect(
        within(list)
          .getAllByRole("option")
          .map((o) => o.textContent),
      ).toEqual(["Schnellnotiz (heute)", "QuartalsplanungBudget klären"]),
    );
    await user.click(within(list).getByRole("option", { name: /Quartalsplanung/ }));

    expect(screen.queryByRole("listbox", { name: "Notizen" })).not.toBeInTheDocument();
    expect(await screen.findByLabelText("Notizinhalt")).toHaveValue("Budget klären");
    expect(screen.getByLabelText("Titel der Notiz")).toHaveValue("Quartalsplanung");
    expect(screen.queryByLabelText("Schnellnotiz")).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Arbeitsnotiz wählen: Quartalsplanung" }));
    await user.click(await screen.findByRole("option", { name: "Schnellnotiz (heute)" }));
    expect(await screen.findByLabelText("Schnellnotiz")).toBeInTheDocument();
  });

  it("merkt sich die Auswahl für heute, nicht für den nächsten Tag", async () => {
    const api = createMemoryApi();
    const note = await api.createNote("Quartalsplanung");
    window.localStorage.setItem("workflow-work-note", JSON.stringify({ date: today, id: note.id }));
    const { unmount } = render(
      <ApiContext.Provider value={api}>
        <HeuteView />
      </ApiContext.Provider>,
    );
    expect(await screen.findByLabelText("Titel der Notiz")).toHaveValue("Quartalsplanung");
    unmount();

    window.localStorage.setItem("workflow-work-note", JSON.stringify({ date: "2000-01-01", id: note.id }));
    setup(api);
    expect(await screen.findByLabelText("Schnellnotiz")).toBeInTheDocument();
  });

  it("fällt auf die Schnellnotiz zurück, wenn die gewählte Notiz gelöscht wurde", async () => {
    const api = createMemoryApi();
    const note = await api.createNote("Weg damit");
    window.localStorage.setItem("workflow-work-note", JSON.stringify({ date: today, id: note.id }));
    await api.deleteNote(note.id);
    setup(api);
    expect(await screen.findByLabelText("Schnellnotiz")).toBeInTheDocument();
  });

  it("sichert die Schnellnotiz auf Wunsch als eigene Notiz", async () => {
    const user = userEvent.setup();
    const api = setup();
    await user.type(await screen.findByLabelText("Schnellnotiz"), "Idee: Newsletter{Enter}Betreff klären");
    await user.click(await screen.findByRole("button", { name: "Als Notiz sichern" }));

    const [note] = await api.listNotes();
    expect(note?.title).toMatch(/^Schnellnotiz /);
    expect((await api.getNote(note?.id ?? "")).plainText).toBe("Idee: Newsletter\nBetreff klären");
    expect(await screen.findByLabelText("Titel der Notiz")).toHaveValue(note?.title);
    expect((await api.getToday(today)).plan.note).toBe("");
  });

  it("zeigt den gespeicherten Text wieder, wenn man zwischendurch eine Aufgabe ansieht", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    await api.createTask({ title: "Mail", categoryId: "Heute", date: today });
    setup(api);

    await user.type(await screen.findByLabelText("Schnellnotiz"), "Wichtiger Gedanke");
    await waitFor(async () => expect((await api.getToday(today)).plan.note).toBe("Wichtiger Gedanke"), {
      timeout: 3000,
    });

    await user.click(await screen.findByRole("button", { name: "Mail" }));
    await user.click(screen.getByRole("button", { name: "Zur Notiz" }));
    expect(await screen.findByLabelText("Schnellnotiz")).toHaveValue("Wichtiger Gedanke");
  });
});
