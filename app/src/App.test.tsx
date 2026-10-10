import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { App } from "./App";
import { ApiContext } from "./api/context";
import { createMemoryApi } from "./api/memory";
import { SettingsProvider } from "./settings/SettingsContext";

vi.mock("./notes/NoteEditor", () => ({
  default: () => <div role="textbox" aria-label="Notizinhalt" />,
}));

function setup(api = createMemoryApi()) {
  render(
    <ApiContext.Provider value={api}>
      <SettingsProvider>
        <App />
      </SettingsProvider>
    </ApiContext.Provider>,
  );
}

beforeEach(() => window.localStorage.clear());

describe("App-Navigation", () => {
  it("klappt die linke Leiste ein und wieder aus", async () => {
    const user = userEvent.setup();
    setup();
    const wrap = () =>
      screen.getByRole("navigation", { name: "Hauptnavigation" }).closest(".navigation-wrap");
    expect(wrap()).not.toHaveAttribute("inert");
    expect(screen.queryByRole("button", { name: "Navigation ausklappen" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Navigation einklappen" }));
    expect(wrap()).toHaveAttribute("inert");

    await user.click(screen.getByRole("button", { name: "Navigation ausklappen" }));
    expect(wrap()).not.toHaveAttribute("inert");
    expect(screen.queryByRole("button", { name: "Navigation ausklappen" })).not.toBeInTheDocument();
  });

  it("reserviert bei eingeklappter Navigation eine schmale Spalte für den Pfeil", async () => {
    const user = userEvent.setup();
    setup();
    const app = document.querySelector<HTMLElement>(".app");
    if (!app) throw new Error("App-Raster fehlt");
    expect(app.style.gridTemplateColumns).toBe("180px 1fr");
    expect(app).not.toHaveClass("nav-collapsed");

    await user.click(screen.getByRole("button", { name: "Navigation einklappen" }));
    expect(app.style.gridTemplateColumns).toBe("36px 1fr");
    expect(app).toHaveClass("nav-collapsed");

    await user.click(screen.getByRole("button", { name: "Navigation ausklappen" }));
    expect(app.style.gridTemplateColumns).toBe("180px 1fr");
  });

  it("merkt sich den eingeklappten Zustand", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Navigation einklappen" }));
    expect(window.localStorage.getItem("workflow-nav-collapsed")).toBe("true");
  });
});

describe("Schnellerfassung", () => {
  it("legt per Cmd/Ctrl+N eine Aufgabe in der Inbox an", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    setup(api);
    await user.keyboard("{Control>}n{/Control}");
    await user.type(screen.getByLabelText("Neue Aufgabe"), "Mail schreiben{Enter}");
    await waitFor(async () =>
      expect((await api.listTasks())[0]).toMatchObject({ title: "Mail schreiben", categoryId: "Inbox" }),
    );
  });

  it("legt eine Notiz an und oeffnet sie in der Notizen-Ansicht", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    setup(api);
    await user.keyboard("{Control>}n{/Control}");
    await user.click(screen.getByRole("button", { name: "Notiz" }));
    await user.type(screen.getByLabelText("Titel der neuen Notiz"), "Meeting{Enter}");

    expect(await screen.findByLabelText("Titel")).toHaveValue("Meeting");
    expect(await screen.findByRole("textbox", { name: "Notizinhalt" })).toBeInTheDocument();
    expect((await api.listNotes())[0]?.title).toBe("Meeting");
  });

  it("oeffnet die verknuepfte Notiz aus einer Aufgabe der Heute-Seite", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const note = await api.createNote("Quartalsplanung");
    const today = new Date();
    const date = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    await api.createTaskFromNote({ noteId: note.id, title: "Folien senden", categoryId: "Heute", date });
    setup(api);

    await user.click(await screen.findByRole("button", { name: "Notiz zu Folien senden öffnen" }));
    expect(await screen.findByLabelText("Titel")).toHaveValue("Quartalsplanung");
  });
});

describe("Papierkorb in der Navigation", () => {
  it("zeigt die Anzahl, öffnet den Papierkorb und aktualisiert sich nach dem Wiederherstellen", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const task = await api.createTask({ title: "Alt", categoryId: "Inbox", date: "2026-10-04" });
    await api.deleteTask(task.id);
    setup(api);

    const trashButton = await screen.findByRole("button", { name: /Papierkorb 1/ });
    expect(trashButton).toBeInTheDocument();

    await user.click(trashButton);
    expect(await screen.findByRole("main", { name: "Papierkorb" })).toBeInTheDocument();
    await user.click(await screen.findByRole("button", { name: "Alt wiederherstellen" }));

    await waitFor(() =>
      expect(screen.getByRole("button", { name: /^🗑︎ Papierkorb$|^Papierkorb$/ })).toBeInTheDocument(),
    );
    expect(screen.queryByRole("button", { name: /Papierkorb 1/ })).not.toBeInTheDocument();
  });

  it("zählt Löschen auf der Aufgaben-Seite sofort mit", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const task = await api.createTask({ title: "Fertig", categoryId: "Inbox", date: "2026-10-04" });
    await api.moveTask(task.id, "Erledigt", "2026-10-04");
    setup(api);

    await user.click(await screen.findByRole("button", { name: "Aufgaben" }));
    await user.click(await screen.findByRole("button", { name: /^Erledigt 1$/ }));
    await user.click(await screen.findByRole("button", { name: "Fertig löschen" }));
    expect(await screen.findByRole("button", { name: /Papierkorb 1/ })).toBeInTheDocument();
  });
});

describe("Globale Suche (Ctrl/Cmd + K)", () => {
  const today = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  it("öffnet und schließt sich mit Ctrl+K und Cmd+K aus jeder Ansicht", async () => {
    const user = userEvent.setup();
    setup();
    await user.keyboard("{Control>}k{/Control}");
    expect(await screen.findByRole("dialog", { name: "Suche" })).toBeInTheDocument();
    await user.keyboard("{Control>}k{/Control}");
    expect(screen.queryByRole("dialog", { name: "Suche" })).not.toBeInTheDocument();

    await user.click(screen.getByRole("button", { name: "Aufgaben" }));
    await user.keyboard("{Meta>}k{/Meta}");
    expect(await screen.findByRole("dialog", { name: "Suche" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "Suche" })).not.toBeInTheDocument();
  });

  it("lässt sich auch über den Suchen-Knopf in der Navigation öffnen", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: /Suchen/ }));
    expect(await screen.findByRole("dialog", { name: "Suche" })).toBeInTheDocument();
  });

  it("öffnet ein gefundenes Notiz-Ergebnis in der Notizen-Ansicht", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    const note = await api.createNote("Quartalsplanung");
    await api.updateNote(note.id, { plainText: "Budget mit Lisa" });
    setup(api);

    await user.keyboard("{Control>}k{/Control}");
    await user.type(screen.getByLabelText("Suchbegriff"), "lisa");
    await user.click(await screen.findByRole("option", { name: /Quartalsplanung/ }));

    expect(screen.queryByRole("dialog", { name: "Suche" })).not.toBeInTheDocument();
    expect(await screen.findByLabelText("Titel")).toHaveValue("Quartalsplanung");
  });

  it("öffnet eine gefundene Aufgabe in ihrer Kategorie und hebt sie hervor", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    await api.createTask({ title: "Anderes", categoryId: "Demnaechst", date: today() });
    const task = await api.createTask({
      title: "Steuern vorbereiten",
      categoryId: "Demnaechst",
      date: today(),
    });
    setup(api);

    await user.keyboard("{Control>}k{/Control}");
    await user.type(screen.getByLabelText("Suchbegriff"), "steuern");
    await user.click(await screen.findByRole("option", { name: /Steuern vorbereiten/ }));

    expect(await screen.findByRole("heading", { name: "Demnächst", level: 1 })).toBeInTheDocument();
    const row = await screen.findByText("Steuern vorbereiten");
    expect(row.closest("li")).toHaveAttribute("data-task-id", task.id);
    expect(row.closest("li")).toHaveClass("selected");
    expect(screen.getByText("Anderes").closest("li")).not.toHaveClass("selected");
  });

  it("öffnet die Schnellnotiz von heute auf der Startseite, die eines früheren Tags als Vorschau", async () => {
    const user = userEvent.setup();
    const api = createMemoryApi();
    await api.updateDailyPlan(today(), { note: "Heute wichtig: Newsletter" });
    await api.updateDailyPlan("2026-01-05", { note: "Damals: Newsletter-Idee" });
    setup(api);

    await user.click(screen.getByRole("button", { name: "Notizen" }));
    await user.keyboard("{Control>}k{/Control}");
    await user.type(screen.getByLabelText("Suchbegriff"), "newsletter");
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(2));
    const options = screen.getAllByRole("option");
    await user.click(options.find((o) => o.textContent?.includes("Damals")) as HTMLElement);
    expect(await screen.findByRole("dialog", { name: /Schnellnotiz vom/ })).toHaveTextContent(
      "Damals: Newsletter-Idee",
    );
    await user.click(screen.getByRole("button", { name: "Schließen" }));

    await user.keyboard("{Control>}k{/Control}");
    await user.type(screen.getByLabelText("Suchbegriff"), "newsletter");
    await waitFor(() => expect(screen.getAllByRole("option")).toHaveLength(2));
    await user.click(
      screen.getAllByRole("option").find((o) => o.textContent?.includes("Heute wichtig")) as HTMLElement,
    );
    expect(await screen.findByLabelText("Schnellnotiz")).toHaveValue("Heute wichtig: Newsletter");
  });
});

describe("Navigation oben: Suchleiste und Erfassen", () => {
  it("steht der Einklapp-Pfeil ganz oben, darunter die Suchleiste und dann Erfassen", () => {
    setup();
    const nav = screen.getByRole("navigation", { name: "Hauptnavigation" });
    const buttons = Array.from(nav.querySelectorAll("button")).map(
      (b) => b.getAttribute("aria-label") ?? b.textContent,
    );
    expect(buttons[0]).toBe("Navigation einklappen");
    expect(buttons[1]).toMatch(/Suchen/);
    expect(buttons[2]).toBe("Erfassen");
    expect(buttons.indexOf("Heute")).toBeGreaterThan(2);
  });

  it("zeigt Suche und Erfassen als schlichte, gleichartige Einträge ohne gefüllte Fläche", () => {
    setup();
    const search = screen.getByRole("button", { name: /Suchen/ });
    const capture = screen.getByRole("button", { name: "Erfassen" });
    expect(search).toHaveClass("search-bar");
    expect(capture).toHaveClass("capture-item");
    expect(capture).toHaveTextContent("+");
    expect(capture).toHaveAttribute("title", expect.stringMatching(/^Erfassen \((⌘N|Strg N)\)$/));
  });

  it("öffnet mit dem Plus die Schnellerfassung und mit der Suchleiste die Suche", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Erfassen" }));
    expect(await screen.findByRole("dialog", { name: "Schnellerfassung" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: /Suchen/ }));
    expect(await screen.findByRole("dialog", { name: "Suche" })).toBeInTheDocument();
  });
});

describe("Schnellerfassung Optik", () => {
  it("nutzt das schlichte Eingabefeld ohne Rahmen und Hintergrund", async () => {
    const user = userEvent.setup();
    setup();
    await user.click(screen.getByRole("button", { name: "Erfassen" }));
    expect(await screen.findByLabelText("Neue Aufgabe")).toHaveClass("capture-input");
  });
});
