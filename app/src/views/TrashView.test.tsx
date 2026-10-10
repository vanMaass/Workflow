import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it } from "vitest";
import { ApiContext } from "../api/context";
import { createMemoryApi } from "../api/memory";
import type { Api } from "../api/types";
import { TrashView } from "./TrashView";

async function withTrash() {
  const api = createMemoryApi();
  const task = await api.createTask({ title: "Alte Aufgabe", categoryId: "Inbox", date: "2026-10-04" });
  const note = await api.createNote("Alte Notiz");
  await api.updateNote(note.id, { plainText: "Mit etwas Inhalt" });
  await api.deleteTask(task.id);
  await api.deleteNote(note.id);
  return { api, task, note };
}

function setup(api: Api) {
  render(
    <ApiContext.Provider value={api}>
      <TrashView />
    </ApiContext.Provider>,
  );
}

describe("TrashView", () => {
  it("zeigt den leeren Papierkorb", async () => {
    setup(createMemoryApi());
    expect(await screen.findByText("Der Papierkorb ist leer.")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Papierkorb leeren/ })).not.toBeInTheDocument();
  });

  it("listet gelöschte Aufgaben und Notizen mit Herkunft", async () => {
    const { api } = await withTrash();
    setup(api);
    const tasks = await screen.findByRole("region", { name: /Aufgaben/ });
    expect(within(tasks).getByText("Alte Aufgabe")).toBeInTheDocument();
    expect(within(tasks).getByText(/aus Inbox/)).toBeInTheDocument();
    const notes = screen.getByRole("region", { name: /Notizen/ });
    expect(within(notes).getByText("Alte Notiz")).toBeInTheDocument();
    expect(within(notes).getByText(/Mit etwas Inhalt/)).toBeInTheDocument();
  });

  it("stellt eine Aufgabe und eine Notiz wieder her", async () => {
    const user = userEvent.setup();
    const { api } = await withTrash();
    setup(api);

    await user.click(await screen.findByRole("button", { name: "Alte Aufgabe wiederherstellen" }));
    await waitFor(async () => expect(await api.listTasks()).toHaveLength(1));
    expect(await screen.findByText("Aufgabe wiederhergestellt.")).toBeInTheDocument();

    await user.click(await screen.findByRole("button", { name: "Alte Notiz wiederherstellen" }));
    await waitFor(async () => expect(await api.listNotes()).toHaveLength(1));
    expect(await screen.findByText("Der Papierkorb ist leer.")).toBeInTheDocument();
  });

  it("löscht einzelne Einträge erst nach Bestätigung endgültig", async () => {
    const user = userEvent.setup();
    const { api } = await withTrash();
    setup(api);

    await user.click(await screen.findByRole("button", { name: "Alte Aufgabe endgültig löschen" }));
    expect((await api.listTrash()).tasks).toHaveLength(1);
    await user.click(screen.getByRole("button", { name: /Alte Aufgabe endgültig löschen Sicher\?/ }));
    await waitFor(async () => expect((await api.listTrash()).tasks).toHaveLength(0));
    expect((await api.listTrash()).notes).toHaveLength(1);
    expect(await screen.findByText("Aufgabe endgültig gelöscht.")).toBeInTheDocument();
  });

  it("leert den ganzen Papierkorb erst nach Bestätigung", async () => {
    const user = userEvent.setup();
    const { api } = await withTrash();
    await api.createTask({ title: "Bleibt", categoryId: "Inbox", date: "2026-10-04" });
    setup(api);

    await user.click(await screen.findByRole("button", { name: "Papierkorb leeren" }));
    expect(await api.trashCount()).toBe(2);
    await user.click(
      screen.getByRole("button", { name: /Papierkorb leeren Wirklich alles endgültig löschen\?/ }),
    );

    expect(await screen.findByText("Der Papierkorb ist leer.")).toBeInTheDocument();
    expect(await api.trashCount()).toBe(0);
    expect(await api.listTasks()).toHaveLength(1);
  });

  it("meldet Ladefehler sichtbar", async () => {
    setup({ ...createMemoryApi(), listTrash: () => Promise.reject(new Error("kaputt")) });
    expect(await screen.findByRole("alert")).toHaveTextContent("kaputt");
  });
});
