import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiContext } from "../api/context";
import { createMemoryApi } from "../api/memory";
import type { Api } from "../api/types";
import { SettingsProvider } from "../settings/SettingsContext";
import { GlobalSearch } from "./GlobalSearch";

async function setup(options: { api?: Api; advanced?: boolean } = {}) {
  const api = options.api ?? createMemoryApi();
  if (options.advanced) await api.updateSettings({ mode: "advanced" });
  const handlers = { onClose: vi.fn(), onOpenNote: vi.fn(), onOpenTask: vi.fn(), onOpenDay: vi.fn() };
  render(
    <ApiContext.Provider value={api}>
      <SettingsProvider>
        <GlobalSearch {...handlers} />
      </SettingsProvider>
    </ApiContext.Provider>,
  );
  return { api, ...handlers };
}

async function seed(api: Api) {
  const kunde = await api.createCategory("Kunde A");
  const task = await api.createTask({ title: "Budget prüfen", categoryId: kunde.id, date: "2026-10-04" });
  const note = await api.createNote("Quartalsplanung");
  await api.updateNote(note.id, { plainText: "Das Budget mit Lisa klären" });
  await api.updateDailyPlan("2026-10-02", { note: "Budget-Idee für später" });
  return { task, note, kunde };
}

const options = () => screen.getAllByRole("option");

beforeEach(() => window.localStorage.clear());

describe("GlobalSearch", () => {
  it("zeigt ohne Eingabe einen Hinweis, dann Treffer mit Art, Titel, Ausschnitt und Hervorhebung", async () => {
    const user = userEvent.setup();
    const { api } = await setup();
    await seed(api);
    expect(screen.getByRole("dialog", { name: "Suche" })).toBeInTheDocument();
    expect(screen.getByLabelText("Suchbegriff")).toHaveFocus();
    expect(screen.getByText(/Tippe einen Begriff/)).toBeInTheDocument();

    await user.type(screen.getByLabelText("Suchbegriff"), "budget");
    await waitFor(() => expect(options()).toHaveLength(3));

    const task = options().find((o) => within(o).queryByText("Aufgabe"));
    expect(task).toBeDefined();
    expect(within(task as HTMLElement).getByText("Budget", { selector: "mark" })).toBeInTheDocument();
    expect(within(task as HTMLElement).getByText(/Kunde A/)).toBeInTheDocument();

    const note = options().find((o) => within(o).queryByText("Notiz"));
    expect(within(note as HTMLElement).getByText("Quartalsplanung")).toBeInTheDocument();
    expect(within(note as HTMLElement).getByText("Budget", { selector: "mark" })).toBeInTheDocument();

    const day = options().find((o) => within(o).queryByText("Schnellnotiz"));
    expect(within(day as HTMLElement).getByText(/2\. Oktober 2026/)).toBeInTheDocument();
  });

  it("sagt, wenn nichts gefunden wurde", async () => {
    const user = userEvent.setup();
    await setup();
    await user.type(screen.getByLabelText("Suchbegriff"), "gibt es nicht");
    expect(await screen.findByText(/Keine Treffer für „gibt es nicht“/)).toBeInTheDocument();
  });

  it("öffnet per Klick und Enter den passenden Fundort und schließt den Dialog", async () => {
    const user = userEvent.setup();
    const { api, onClose, onOpenNote, onOpenTask, onOpenDay } = await setup();
    const { task, note, kunde } = await seed(api);
    await user.type(screen.getByLabelText("Suchbegriff"), "budget");
    await waitFor(() => expect(options()).toHaveLength(3));

    await user.click(options().find((o) => within(o).queryByText("Notiz")) as HTMLElement);
    expect(onOpenNote).toHaveBeenCalledWith(note.id);
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.click(options().find((o) => within(o).queryByText("Aufgabe")) as HTMLElement);
    expect(onOpenTask).toHaveBeenCalledWith(expect.objectContaining({ id: task.id, categoryId: kunde.id }));

    await user.click(options().find((o) => within(o).queryByText("Schnellnotiz")) as HTMLElement);
    expect(onOpenDay).toHaveBeenCalledWith("2026-10-02");
  });

  it("lässt sich mit Pfeiltasten, Enter und Escape bedienen", async () => {
    const user = userEvent.setup();
    const { api, onClose, onOpenNote, onOpenTask } = await setup();
    await seed(api);
    await user.type(screen.getByLabelText("Suchbegriff"), "budget");
    await waitFor(() => expect(options()).toHaveLength(3));

    // Titeltreffer stehen vorn: Aufgabe, dann Notiz (Inhalt), dann Schnellnotiz.
    expect(options()[0]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowDown}");
    expect(options()[1]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowUp}{ArrowUp}");
    expect(options()[2]).toHaveAttribute("aria-selected", "true");
    await user.keyboard("{ArrowDown}{Enter}");
    expect(onOpenTask).toHaveBeenCalledTimes(1);
    expect(onOpenNote).not.toHaveBeenCalled();
    expect(onClose).toHaveBeenCalledTimes(1);

    await user.keyboard("{Escape}");
    expect(onClose).toHaveBeenCalledTimes(2);
  });

  it("bietet im Easy Mode nur Alles, Aufgaben und Notizen an; Notizen schließt Schnellnotizen ein", async () => {
    const user = userEvent.setup();
    const { api } = await setup();
    await seed(api);
    const filters = within(screen.getByRole("group", { name: "Filter" }));
    expect(filters.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Alles",
      "Aufgaben",
      "Notizen",
    ]);
    expect(screen.queryByRole("group", { name: "Suchen in" })).not.toBeInTheDocument();

    await user.type(screen.getByLabelText("Suchbegriff"), "budget");
    await waitFor(() => expect(options()).toHaveLength(3));
    await user.click(filters.getByRole("button", { name: "Aufgaben" }));
    await waitFor(() => expect(options()).toHaveLength(1));
    await user.click(filters.getByRole("button", { name: "Notizen" }));
    await waitFor(() => expect(options()).toHaveLength(2));
  });

  it("bietet im Advanced Mode zusätzlich Schnellnotizen und den Suchbereich", async () => {
    const user = userEvent.setup();
    const { api } = await setup({ advanced: true });
    await seed(api);
    // Die Einstellungen laden asynchron; erst danach erscheinen die erweiterten Filter.
    expect(await screen.findByRole("group", { name: "Suchen in" })).toBeInTheDocument();
    const filters = within(screen.getByRole("group", { name: "Filter" }));
    expect(filters.getAllByRole("button").map((b) => b.textContent)).toEqual([
      "Alles",
      "Aufgaben",
      "Notizen",
      "Schnellnotizen",
    ]);
    const scope = within(screen.getByRole("group", { name: "Suchen in" }));

    await user.type(screen.getByLabelText("Suchbegriff"), "budget");
    await waitFor(() => expect(options()).toHaveLength(3));
    const kinds = () => options().map((o) => o.querySelector(".hit-kind")?.textContent);
    await user.click(filters.getByRole("button", { name: "Notizen" }));
    await waitFor(() => expect(kinds()).toEqual(["Notiz"]));
    await user.click(filters.getByRole("button", { name: "Schnellnotizen" }));
    await waitFor(() => expect(kinds()).toEqual(["Schnellnotiz"]));

    await user.click(filters.getByRole("button", { name: "Alles" }));
    await waitFor(() => expect(kinds()).toHaveLength(3));
    await user.click(scope.getByRole("button", { name: "Titel" }));
    await waitFor(() => expect(kinds()).toEqual(["Aufgabe"]));
    await user.click(scope.getByRole("button", { name: "Inhalt" }));
    await waitFor(() => expect([...kinds()].sort()).toEqual(["Notiz", "Schnellnotiz"]));
  });

  it("meldet Fehler sichtbar", async () => {
    const user = userEvent.setup();
    await setup({ api: { ...createMemoryApi(), search: () => Promise.reject(new Error("kaputt")) } });
    await user.type(screen.getByLabelText("Suchbegriff"), "x");
    expect(await screen.findByRole("alert")).toHaveTextContent("kaputt");
  });
});

describe("GlobalSearch Optik", () => {
  it("nutzt das schlichte Eingabefeld ohne Rahmen und Hintergrund", async () => {
    await setup();
    expect(screen.getByLabelText("Suchbegriff")).toHaveClass("global-search-input");
  });
});
