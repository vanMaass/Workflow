import { describe, expect, it } from "vitest";
import { createMemoryApi } from "./memory";

describe("memory api", () => {
  it("plant neue Heute-Aufgaben fuer das Datum ein", async () => {
    const api = createMemoryApi();
    await api.createTask({ title: "  Bericht  ", categoryId: "Heute", date: "2026-10-04" });
    const view = await api.getToday("2026-10-04");
    expect(view.tasks.map((t) => t.title)).toEqual(["Bericht"]);
    expect(view.carryover).toEqual([]);
  });

  it("lehnt leere Titel ab", async () => {
    await expect(
      createMemoryApi().createTask({ title: "  ", categoryId: "Inbox", date: "2026-10-04" }),
    ).rejects.toThrow();
  });

  it("zeigt offene Aufgaben von gestern als Carryover, nie automatisch heute", async () => {
    const api = createMemoryApi();
    await api.createTask({ title: "Alt", categoryId: "Heute", date: "2026-10-03" });
    const view = await api.getToday("2026-10-04");
    expect(view.tasks).toEqual([]);
    expect(view.carryover.map((t) => t.title)).toEqual(["Alt"]);
  });

  it("Statuswechsel: erledigen behaelt Plan-Datum, Demnaechst loest es", async () => {
    const api = createMemoryApi();
    const task = await api.createTask({ title: "A", categoryId: "Heute", date: "2026-10-04" });
    const done = await api.moveTask(task.id, "Erledigt", "2026-10-04");
    expect(done.plannedDate).toBe("2026-10-04");
    expect(done.completedAt).not.toBeNull();
    expect((await api.getToday("2026-10-04")).tasks).toHaveLength(1);

    const later = await api.moveTask(task.id, "Demnaechst", "2026-10-04");
    expect(later.plannedDate).toBeNull();
    expect(later.completedAt).toBeNull();
    expect(later.version).toBe(3);
    expect((await api.getToday("2026-10-04")).tasks).toHaveLength(0);
  });

  it("speichert Fokus und Notiz getrennt", async () => {
    const api = createMemoryApi();
    await api.updateDailyPlan("2026-10-04", { focus: "Release" });
    const plan = await api.updateDailyPlan("2026-10-04", { note: "Idee" });
    expect(plan).toMatchObject({ focus: "Release", note: "Idee" });
  });
});

describe("memory api listTasks", () => {
  it("liefert alle Aufgaben aller Status", async () => {
    const api = createMemoryApi();
    await api.createTask({ title: "A", categoryId: "Inbox", date: "2026-10-04" });
    await api.createTask({ title: "B", categoryId: "Demnaechst", date: "2026-10-04" });
    expect((await api.listTasks()).map((t) => t.title)).toEqual(["A", "B"]);
  });
});

describe("memory api categories", () => {
  it("startet mit den vier festen Kategorien", async () => {
    const names = (await createMemoryApi().listCategories()).map((c) => c.name);
    expect(names).toEqual(["Inbox", "Heute", "Demnächst", "Erledigt"]);
  });

  it("legt eigene Kategorien an, lehnt Duplikate und leere Namen ab", async () => {
    const api = createMemoryApi();
    const kunde = await api.createCategory("  Kunde A ");
    expect(kunde).toMatchObject({ name: "Kunde A", isSystem: false });
    await expect(api.createCategory("kunde a")).rejects.toThrow();
    await expect(api.createCategory("  ")).rejects.toThrow();
  });

  it("legt Aufgaben in eigene Kategorien, ohne sie fuer heute einzuplanen", async () => {
    const api = createMemoryApi();
    const kunde = await api.createCategory("Kunde A");
    const task = await api.createTask({ title: "Angebot", categoryId: kunde.id, date: "2026-10-04" });
    expect(task).toMatchObject({ categoryId: kunde.id, plannedDate: null });
    expect((await api.getToday("2026-10-04")).tasks).toHaveLength(0);
    await expect(
      api.createTask({ title: "x", categoryId: "gibt-es-nicht", date: "2026-10-04" }),
    ).rejects.toThrow();
  });

  it("entfernt eine Kategorie (Aufgaben in die Inbox) und stellt sie wieder her", async () => {
    const api = createMemoryApi();
    const kunde = await api.createCategory("Kunde A");
    const task = await api.createTask({ title: "A", categoryId: kunde.id, date: "2026-10-04" });

    const moved = await api.deleteCategory(kunde.id);
    expect(moved).toEqual([task.id]);
    expect((await api.listTasks())[0]?.categoryId).toBe("Inbox");
    expect(await api.listCategories()).toHaveLength(4);

    await api.restoreCategory(kunde.id, moved);
    expect((await api.listTasks())[0]?.categoryId).toBe(kunde.id);
    expect(await api.listCategories()).toHaveLength(5);
  });

  it("schuetzt feste Kategorien vor dem Entfernen", async () => {
    await expect(createMemoryApi().deleteCategory("Heute")).rejects.toThrow();
  });
});

describe("memory api reopen und loeschen", () => {
  it("holt eine erledigte Aufgabe dorthin zurueck, wo sie abgehakt wurde", async () => {
    const api = createMemoryApi();
    const kunde = await api.createCategory("Kunde A");
    const later = await api.createTask({ title: "Später", categoryId: "Demnaechst", date: "2026-10-04" });
    const custom = await api.createTask({ title: "Angebot", categoryId: kunde.id, date: "2026-10-04" });
    const today = await api.createTask({ title: "Heute", categoryId: "Heute", date: "2026-10-04" });
    for (const t of [later, custom, today]) {
      const done = await api.moveTask(t.id, "Erledigt", "2026-10-04");
      expect(done.completedFrom).toBe(t.categoryId);
    }

    expect((await api.reopenTask(later.id, "2026-10-05")).categoryId).toBe("Demnaechst");
    expect((await api.reopenTask(custom.id, "2026-10-05")).categoryId).toBe(kunde.id);
    const back = await api.reopenTask(today.id, "2026-10-05");
    expect(back).toMatchObject({ categoryId: "Heute", plannedDate: "2026-10-05", completedFrom: null });
  });

  it("faellt auf die Inbox zurueck, wenn die Herkunftskategorie entfernt wurde", async () => {
    const api = createMemoryApi();
    const kunde = await api.createCategory("Kunde A");
    const task = await api.createTask({ title: "A", categoryId: kunde.id, date: "2026-10-04" });
    await api.moveTask(task.id, "Erledigt", "2026-10-04");
    await api.deleteCategory(kunde.id);
    expect((await api.reopenTask(task.id, "2026-10-04")).categoryId).toBe("Inbox");
    await expect(api.reopenTask(task.id, "2026-10-04")).rejects.toThrow();
  });

  it("loescht einzeln oder alle erledigten Aufgaben und stellt sie wieder her", async () => {
    const api = createMemoryApi();
    const a = await api.createTask({ title: "A", categoryId: "Inbox", date: "2026-10-04" });
    const b = await api.createTask({ title: "B", categoryId: "Inbox", date: "2026-10-04" });
    await api.createTask({ title: "Offen", categoryId: "Inbox", date: "2026-10-04" });
    await api.moveTask(a.id, "Erledigt", "2026-10-04");
    await api.moveTask(b.id, "Erledigt", "2026-10-04");

    await api.deleteTask(a.id);
    expect((await api.listTasks()).map((t) => t.title)).toEqual(["B", "Offen"]);
    const ids = await api.deleteDoneTasks();
    expect(ids).toEqual([b.id]);
    expect((await api.listTasks()).map((t) => t.title)).toEqual(["Offen"]);

    await api.restoreTasks([a.id, b.id]);
    const restored = (await api.listTasks()).filter((t) => t.categoryId === "Erledigt");
    expect(restored).toHaveLength(2);
  });
});

describe("memory api notes", () => {
  const doc = JSON.stringify({ type: "doc", content: [] });

  it("legt Notizen an, speichert Teilaenderungen und leitet den Titel aus der ersten Zeile ab", async () => {
    const api = createMemoryApi();
    const note = await api.createNote();
    expect((await api.listNotes())[0]?.title).toBe("Neue Notiz");

    await api.updateNote(note.id, { content: doc, plainText: "\n Meeting mit Lisa \nZweite Zeile" });
    const [summary] = await api.listNotes();
    expect(summary).toMatchObject({ title: "Meeting mit Lisa", excerpt: "Meeting mit Lisa Zweite Zeile" });

    await api.updateNote(note.id, { title: " Eigener Titel " });
    expect((await api.listNotes())[0]?.title).toBe("Eigener Titel");
    expect((await api.getNote(note.id)).plainText).toContain("Meeting mit Lisa");
  });

  it("sortiert angeheftete zuerst; Anheften aendert die Bearbeitungszeit nicht", async () => {
    const api = createMemoryApi();
    const a = await api.createNote("Alt");
    await new Promise((r) => setTimeout(r, 3));
    await api.createNote("Neu");
    expect((await api.listNotes()).map((n) => n.title)).toEqual(["Neu", "Alt"]);

    const before = (await api.getNote(a.id)).updatedAt;
    const pinned = await api.updateNote(a.id, { pinned: true });
    expect(pinned.updatedAt).toBe(before);
    expect((await api.listNotes()).map((n) => n.title)).toEqual(["Alt", "Neu"]);
  });

  it("durchsucht Titel und Text und lehnt ungueltige Inhalte ab", async () => {
    const api = createMemoryApi();
    const a = await api.createNote("Quartalsplanung");
    const b = await api.createNote("Idee");
    await api.updateNote(b.id, { plainText: "Rabatt 50% auf alles" });
    expect((await api.listNotes("QUARTAL")).map((n) => n.id)).toEqual([a.id]);
    expect((await api.listNotes("50%")).map((n) => n.id)).toEqual([b.id]);
    expect(await api.listNotes("gibt es nicht")).toEqual([]);
    expect(await api.listNotes("  ")).toHaveLength(2);
    await expect(api.updateNote(a.id, { content: "{kaputt" })).rejects.toThrow();
  });

  it("loescht und stellt Notizen wieder her", async () => {
    const api = createMemoryApi();
    const note = await api.createNote("A");
    await api.deleteNote(note.id);
    expect(await api.listNotes()).toEqual([]);
    await expect(api.getNote(note.id)).rejects.toThrow();
    await api.restoreNote(note.id);
    expect(await api.listNotes()).toHaveLength(1);
  });

  it("verknuepft Aufgaben mit Notizen; der Hinweis verschwindet mit der geloeschten Notiz", async () => {
    const api = createMemoryApi();
    const note = await api.createNote("Meeting");
    const task = await api.createTaskFromNote({
      noteId: note.id,
      title: "Folien senden",
      categoryId: "Heute",
      date: "2026-10-04",
    });
    expect(task).toMatchObject({ noteId: note.id, categoryId: "Heute", plannedDate: "2026-10-04" });
    expect((await api.getToday("2026-10-04")).tasks[0]?.noteId).toBe(note.id);

    await api.deleteNote(note.id);
    expect((await api.listTasks())[0]?.noteId).toBeNull();
    await api.restoreNote(note.id);
    expect((await api.listTasks())[0]?.noteId).toBe(note.id);

    await expect(
      api.createTaskFromNote({
        noteId: "gibt-es-nicht",
        title: "x",
        categoryId: "Inbox",
        date: "2026-10-04",
      }),
    ).rejects.toThrow();
    expect(await api.listTasks()).toHaveLength(1);
  });
});

describe("memory api search", () => {
  async function seeded() {
    const api = createMemoryApi();
    await api.createTask({ title: "Äpfel kaufen", categoryId: "Inbox", date: "2026-10-04" });
    const note = await api.createNote("Einkauf");
    await api.updateNote(note.id, { plainText: "Liste: Brot, ÄPFEL und Käse" });
    await api.updateDailyPlan("2026-10-03", { note: "Morgen äpfel nicht vergessen" });
    return api;
  }

  it("findet Aufgaben, Notizen und Schnellnotizen ohne Beachtung der Groß-/Kleinschreibung", async () => {
    const api = await seeded();
    const hits = await api.search("ÄPFEL");
    expect(hits.map((h) => h.kind).sort()).toEqual(["day", "note", "task"]);
    expect(await api.search("äpfel")).toHaveLength(3);
  });

  it("verlangt alle Suchbegriffe und liefert bei leerer Suche nichts", async () => {
    const api = await seeded();
    expect(await api.search("einkauf käse")).toHaveLength(1);
    expect(await api.search("einkauf bob")).toEqual([]);
    expect(await api.search("   ")).toEqual([]);
    await expect(api.search("x".repeat(201))).rejects.toThrow();
  });

  it("zeigt einen Ausschnitt um die Fundstelle und stellt Titeltreffer voran", async () => {
    const api = createMemoryApi();
    const text = `${"Vorlauf ".repeat(30)}Newsletter ${"Nachlauf ".repeat(30)}`;
    const a = await api.createNote("Ideen");
    await api.updateNote(a.id, { plainText: text });
    await new Promise((r) => setTimeout(r, 3));
    await api.createNote("Newsletter-Plan");

    const hits = await api.search("newsletter");
    expect(hits.map((h) => h.title)).toEqual(["Newsletter-Plan", "Ideen"]);
    expect(hits[0]?.titleMatch).toBe(true);
    const excerpt = hits[1]?.excerpt ?? "";
    expect(excerpt).toContain("Newsletter");
    expect(excerpt.startsWith("…") && excerpt.endsWith("…")).toBe(true);
    expect(excerpt.length).toBeLessThan(160);
  });

  it("filtert nach Art und Suchbereich", async () => {
    const api = createMemoryApi();
    await api.createTask({ title: "Budget prüfen", categoryId: "Inbox", date: "2026-10-04" });
    const note = await api.createNote("Notiz");
    await api.updateNote(note.id, { plainText: "Budget im Text" });
    await api.createNote("Budget");
    await api.updateDailyPlan("2026-10-04", { focus: "Budget klären" });

    expect(await api.search("budget")).toHaveLength(4);
    expect(await api.search("budget", { scope: "title" })).toHaveLength(2);
    const content = await api.search("budget", { scope: "content" });
    expect(content.map((h) => h.kind).sort()).toEqual(["day", "note"]);
    expect(await api.search("budget", { kinds: ["task"] })).toHaveLength(1);
    expect(await api.search("budget", { kinds: ["note", "day"] })).toHaveLength(3);
  });

  it("übergibt Kategorie und Datum für die Navigation und überspringt Gelöschtes", async () => {
    const api = createMemoryApi();
    const kunde = await api.createCategory("Kunde A");
    const task = await api.createTask({
      title: "Angebot schreiben",
      categoryId: kunde.id,
      date: "2026-10-04",
    });
    const gone = await api.createTask({ title: "Angebot löschen", categoryId: "Inbox", date: "2026-10-04" });
    await api.deleteTask(gone.id);
    await api.updateDailyPlan("2026-10-02", { note: "Gedanke zum Roadtrip" });

    const [hit] = await api.search("angebot");
    expect(hit).toMatchObject({ kind: "task", id: task.id, categoryId: kunde.id, categoryName: "Kunde A" });
    expect(await api.search("angebot")).toHaveLength(1);
    expect((await api.search("roadtrip"))[0]).toMatchObject({
      kind: "day",
      id: "2026-10-02",
      date: "2026-10-02",
    });
  });

  it("begrenzt die Trefferzahl", async () => {
    const api = createMemoryApi();
    for (let i = 0; i < 60; i++)
      await api.createTask({ title: `Treffer ${i}`, categoryId: "Inbox", date: "2026-10-04" });
    expect(await api.search("treffer")).toHaveLength(50);
  });
});
