import { describe, expect, it, vi } from "vitest";
import { createMemoryApi } from "../api/memory";
import { trackMutations } from "./trackMutations";

describe("trackMutations", () => {
  it("meldet Änderungen nach schreibenden Aufrufen, nicht nach Lesezugriffen", async () => {
    const onChange = vi.fn();
    const api = trackMutations(createMemoryApi(), onChange);

    await api.listTasks();
    await api.listNotes();
    await api.trashCount();
    await api.getToday("2026-10-04");
    expect(onChange).not.toHaveBeenCalled();

    const note = await api.createNote("A");
    expect(onChange).toHaveBeenCalledTimes(1);
    await api.deleteNote(note.id);
    expect(onChange).toHaveBeenCalledTimes(2);
  });

  it("gibt Ergebnisse und Fehler unverändert weiter und meldet bei Fehlern nichts", async () => {
    const onChange = vi.fn();
    const api = trackMutations(createMemoryApi(), onChange);
    const note = await api.createNote("A");
    expect(note.title).toBe("A");
    onChange.mockClear();

    await expect(api.deleteNote("gibt-es-nicht")).rejects.toThrow();
    expect(onChange).not.toHaveBeenCalled();
  });

  it("funktioniert auch für Methoden, die intern andere Methoden nutzen", async () => {
    const onChange = vi.fn();
    const api = trackMutations(createMemoryApi(), onChange);
    const note = await api.createNote("Meeting");
    const task = await api.createTaskFromNote({
      noteId: note.id,
      title: "Folien",
      categoryId: "Inbox",
      date: "2026-10-04",
    });
    expect(task.noteId).toBe(note.id);
  });
});
