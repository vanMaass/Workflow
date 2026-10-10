import {
  CATEGORY,
  DEFAULT_SETTINGS,
  type Api,
  type Category,
  type Note,
  type NoteSummary,
  type SearchHit,
  type Trash,
  type DailyPlan,
  type Settings,
  type Task,
} from "./types";

interface Store {
  tasks: Task[];
  /** Geloeschte Aufgaben (Papierkorb). */
  trash: Task[];
  notes: Note[];
  /** Geloeschte Notizen (Papierkorb). */
  trashedNotes: Note[];
  /** Zeitpunkt des Loeschens je ID (Aufgaben und Notizen im Papierkorb). */
  deletedAt: Record<string, number>;
  plans: DailyPlan[];
  categories: Category[];
  /** Eigene Kategorien, die entfernt wurden (fuer Rueckgaengig). */
  removedCategories: Category[];
}

const STORAGE_KEY = "workflow-dev-store";
const SETTINGS_KEY = "workflow-dev-settings";

const SYSTEM_CATEGORIES: [string, string][] = [
  [CATEGORY.inbox, "Inbox"],
  [CATEGORY.today, "Heute"],
  [CATEGORY.upcoming, "Demnächst"],
  [CATEGORY.done, "Erledigt"],
];

function systemCategories(): Category[] {
  const now = Date.now();
  return SYSTEM_CATEGORIES.map(([id, name], index) => ({
    id,
    name,
    isSystem: true,
    position: index + 1,
    version: 1,
    createdAt: now,
    updatedAt: now,
  }));
}

function emptyStore(): Store {
  return { tasks: [], trash: [], notes: [], trashedNotes: [], deletedAt: {}, plans: [], categories: systemCategories(), removedCategories: [] };
}

function load(): Store {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw) as Partial<Store>;
      const store: Store = { ...emptyStore(), ...stored };
      if (!stored.categories) store.categories = systemCategories();
      // Aeltere Entwicklungsstaende kannten nur `status` statt `categoryId`.
      for (const task of store.tasks as (Task & { status?: string })[]) {
        task.categoryId ??= task.status ?? CATEGORY.inbox;
        task.completedFrom ??=
          task.categoryId === CATEGORY.done && task.plannedDate !== null ? CATEGORY.today : null;
      }
      return store;
    }
  } catch {
    // Speicher nicht lesbar: mit leerem Bestand starten.
  }
  return emptyStore();
}

function save(store: Store): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
  } catch {
    // Nur Entwicklungs-Fallback; Fehler hier sind unkritisch.
  }
}

function displayTitle(title: string, plainText: string): string {
  const trimmed = title.trim();
  if (trimmed) return trimmed;
  const firstLine = plainText
    .split("\n")
    .map((line) => line.trim())
    .find(Boolean);
  return firstLine ? firstLine.slice(0, 80) : "Neue Notiz";
}

const MAX_SEARCH_HITS = 50;

/** Textausschnitt um die Fundstelle, wie im Rust-Kern. */
function snippet(text: string, at: number, length: number): string {
  const start = Math.max(0, at - 40);
  const end = Math.min(text.length, at + length + 90);
  const body = text.slice(start, end).split(/\s+/).filter(Boolean).join(" ");
  return `${start > 0 ? "… " : ""}${body}${end < text.length ? " …" : ""}`;
}

const byPosition = <T extends { position: number }>(a: T, b: T) => a.position - b.position;

/**
 * Spiegelt die Regeln des Rust-Kerns im Speicher. Wird nur ausserhalb von Tauri
 * (Browser-Entwicklung, Tests) verwendet.
 */
export function createMemoryApi(options: { persist?: boolean } = {}): Api {
  const store: Store = options.persist ? load() : emptyStore();
  const commit = () => {
    if (options.persist) save(store);
  };

  let settings: Settings = { ...DEFAULT_SETTINGS };
  if (options.persist) {
    try {
      settings = { ...settings, ...JSON.parse(window.localStorage.getItem(SETTINGS_KEY) ?? "{}") };
    } catch {
      // Unlesbare Einstellungen: Standardwerte verwenden.
    }
  }

  function planFor(date: string): DailyPlan {
    let plan = store.plans.find((p) => p.date === date);
    if (!plan) {
      const now = Date.now();
      plan = { id: crypto.randomUUID(), date, focus: "", note: "", version: 1, createdAt: now, updatedAt: now };
      store.plans.push(plan);
    }
    return plan;
  }

  function taskById(id: string): Task {
    const task = store.tasks.find((t) => t.id === id);
    if (!task) throw new Error(`Aufgabe nicht gefunden: ${id}`);
    return task;
  }

  /** Verknuepfungen zu geloeschten Notizen bleiben gespeichert, werden aber nicht angezeigt. */
  function withLiveNoteLink(task: Task): Task {
    const live = task.noteId !== null && store.notes.some((n) => n.id === task.noteId);
    return live ? task : { ...task, noteId: null };
  }

  function noteById(id: string): Note {
    const note = store.notes.find((n) => n.id === id);
    if (!note) throw new Error(`Notiz nicht gefunden: ${id}`);
    return note;
  }

  function ensureCategory(id: string) {
    if (!store.categories.some((c) => c.id === id)) throw new Error(`Kategorie nicht gefunden: ${id}`);
  }

  function applyCategory(task: Task, categoryId: string, date: string) {
    const from = task.categoryId;
    task.completedFrom =
      categoryId === CATEGORY.done ? (from === CATEGORY.done ? task.completedFrom : from) : null;
    task.plannedDate =
      categoryId === CATEGORY.today ? date : categoryId === CATEGORY.done ? task.plannedDate : null;
    task.completedAt = categoryId === CATEGORY.done ? Date.now() : null;
    task.categoryId = categoryId;
  }

  return {
    async getSettings() {
      return { ...settings };
    },

    async updateSettings(patch) {
      settings = { ...settings, ...patch };
      if (options.persist) {
        try {
          window.localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
        } catch {
          // Nur Entwicklungs-Fallback.
        }
      }
      return { ...settings };
    },

    async listTasks() {
      return structuredClone([...store.tasks].sort(byPosition).map(withLiveNoteLink));
    },

    async getToday(date) {
      const plan = planFor(date);
      commit();
      const tasks = store.tasks
        .filter(
          (t) => t.plannedDate === date && (t.categoryId === CATEGORY.today || t.categoryId === CATEGORY.done),
        )
        .sort(byPosition);
      const carryover = store.tasks
        .filter((t) => t.categoryId === CATEGORY.today && t.plannedDate !== null && t.plannedDate < date)
        .sort((a, b) => (a.plannedDate ?? "").localeCompare(b.plannedDate ?? "") || byPosition(a, b));
      return structuredClone({
        plan,
        tasks: tasks.map(withLiveNoteLink),
        carryover: carryover.map(withLiveNoteLink),
      });
    },

    async createTask({ title, categoryId, date }) {
      const trimmed = title.trim();
      if (!trimmed) throw new Error("Der Titel darf nicht leer sein.");
      ensureCategory(categoryId);
      const now = Date.now();
      const task: Task = {
        id: crypto.randomUUID(),
        title: trimmed,
        categoryId,
        priority: null,
        durationMinutes: null,
        pageId: null,
        noteId: null,
        plannedDate: null,
        position: Math.max(0, ...store.tasks.map((t) => t.position)) + 1,
        version: 1,
        createdAt: now,
        updatedAt: now,
        completedAt: null,
        completedFrom: null,
      };
      applyCategory(task, categoryId, date);
      store.tasks.push(task);
      commit();
      return structuredClone(task);
    },

    async moveTask(id, categoryId, date) {
      ensureCategory(categoryId);
      const task = taskById(id);
      applyCategory(task, categoryId, date);
      task.version += 1;
      task.updatedAt = Date.now();
      commit();
      return structuredClone(task);
    },

    async listNotes(query) {
      const needle = query?.trim().toLowerCase() ?? "";
      const matches = (n: Note) =>
        !needle || n.title.toLowerCase().includes(needle) || n.plainText.toLowerCase().includes(needle);
      const summaries: NoteSummary[] = store.notes
        .filter(matches)
        .sort((a, b) => Number(b.pinned) - Number(a.pinned) || b.updatedAt - a.updatedAt)
        .map((n) => ({
          id: n.id,
          title: displayTitle(n.title, n.plainText),
          excerpt: n.plainText.split(/\s+/).filter(Boolean).join(" ").slice(0, 120),
          pinned: n.pinned,
          createdAt: n.createdAt,
          updatedAt: n.updatedAt,
        }));
      return structuredClone(summaries);
    },

    async getNote(id) {
      return structuredClone(noteById(id));
    },

    async createNote(title) {
      const now = Date.now();
      const note: Note = {
        id: crypto.randomUUID(),
        title: (title ?? "").trim(),
        content: "",
        plainText: "",
        pinned: false,
        pageId: null,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      store.notes.push(note);
      commit();
      return structuredClone(note);
    },

    async updateNote(id, patch) {
      const note = noteById(id);
      if (patch.content) JSON.parse(patch.content); // wie im Rust-Kern: ungueltiges JSON wird abgelehnt
      const textChanged = patch.title !== undefined || patch.content !== undefined || patch.plainText !== undefined;
      if (patch.title !== undefined) note.title = patch.title.trim();
      if (patch.content !== undefined) note.content = patch.content;
      if (patch.plainText !== undefined) note.plainText = patch.plainText;
      if (patch.pinned !== undefined) note.pinned = patch.pinned;
      if (textChanged) note.updatedAt = Date.now();
      note.version += 1;
      commit();
      return structuredClone(note);
    },

    async deleteNote(id) {
      const note = noteById(id);
      store.notes = store.notes.filter((n) => n.id !== id);
      store.trashedNotes.push(note);
      store.deletedAt[id] = Date.now();
      commit();
    },

    async restoreNote(id) {
      const note = store.trashedNotes.find((n) => n.id === id);
      if (!note) throw new Error(`Geloeschte Notiz nicht gefunden: ${id}`);
      store.trashedNotes = store.trashedNotes.filter((n) => n.id !== id);
      delete store.deletedAt[id];
      store.notes.push(note);
      commit();
    },

    async createTaskFromNote({ noteId, title, categoryId, date }) {
      noteById(noteId);
      const task = await this.createTask({ title, categoryId, date });
      const stored = taskById(task.id);
      stored.noteId = noteId;
      commit();
      return structuredClone(stored);
    },

    async search(query, options = {}) {
      if (query.length > 200) throw new Error("Suchbegriff ist laenger als 200 Zeichen");
      const terms = query.toLowerCase().split(/\s+/).filter(Boolean);
      if (terms.length === 0) return [];
      const scope = options.scope ?? "all";
      const wants = (kind: SearchHit["kind"]) => !options.kinds?.length || options.kinds.includes(kind);
      const inTitle = scope !== "content";
      const inContent = scope !== "title";
      const has = (text: string, term: string) => text.toLowerCase().includes(term);
      const hits: SearchHit[] = [];

      if (wants("task") && inTitle) {
        for (const t of store.tasks) {
          if (!terms.every((term) => has(t.title, term))) continue;
          const category = store.categories.find((c) => c.id === t.categoryId);
          hits.push({
            kind: "task",
            id: t.id,
            title: t.title,
            excerpt: "",
            categoryId: t.categoryId,
            categoryName: category?.name ?? null,
            date: t.plannedDate,
            titleMatch: true,
            updatedAt: t.updatedAt,
          });
        }
      }

      if (wants("note")) {
        for (const n of store.notes) {
          const title = displayTitle(n.title, n.plainText);
          const matched = terms.every((term) =>
            scope === "all"
              ? has(title, term) || has(n.plainText, term)
              : scope === "title"
                ? has(title, term)
                : has(n.plainText, term),
          );
          if (!matched) continue;
          const first = terms.find((term) => has(n.plainText, term));
          const at = first ? n.plainText.toLowerCase().indexOf(first) : -1;
          hits.push({
            kind: "note",
            id: n.id,
            title,
            excerpt:
              inContent && first && at >= 0
                ? snippet(n.plainText, at, first.length)
                : n.plainText.split(/\s+/).filter(Boolean).join(" ").slice(0, 120),
            categoryId: null,
            categoryName: null,
            date: null,
            titleMatch: inTitle && terms.every((term) => has(title, term)),
            updatedAt: n.updatedAt,
          });
        }
      }

      if (wants("day") && inContent) {
        for (const plan of store.plans) {
          const text = plan.focus ? `${plan.focus}\n${plan.note}` : plan.note;
          if (!text || !terms.every((term) => has(text, term))) continue;
          const first = terms.find((term) => has(text, term)) ?? "";
          hits.push({
            kind: "day",
            id: plan.date,
            title: plan.date,
            excerpt: snippet(text, text.toLowerCase().indexOf(first), first.length),
            categoryId: null,
            categoryName: null,
            date: plan.date,
            titleMatch: false,
            updatedAt: plan.updatedAt,
          });
        }
      }

      hits.sort((a, b) => Number(b.titleMatch) - Number(a.titleMatch) || b.updatedAt - a.updatedAt);
      return structuredClone(hits.slice(0, MAX_SEARCH_HITS));
    },

    async listTrash() {
      const categoryName = (id: string) =>
        [...store.categories, ...store.removedCategories].find((c) => c.id === id)?.name ?? null;
      const deletedAt = (id: string) => store.deletedAt[id] ?? 0;
      const trash: Trash = {
        tasks: store.trash
          .map((t) => ({
            id: t.id,
            title: t.title,
            categoryId: t.categoryId,
            categoryName: categoryName(t.categoryId),
            deletedAt: deletedAt(t.id),
          }))
          .sort((a, b) => b.deletedAt - a.deletedAt),
        notes: store.trashedNotes
          .map((n) => ({
            id: n.id,
            title: displayTitle(n.title, n.plainText),
            excerpt: n.plainText.split(/\s+/).filter(Boolean).join(" ").slice(0, 120),
            deletedAt: deletedAt(n.id),
          }))
          .sort((a, b) => b.deletedAt - a.deletedAt),
      };
      return structuredClone(trash);
    },

    async trashCount() {
      return store.trash.length + store.trashedNotes.length;
    },

    async purgeTasks(ids) {
      const before = store.trash.length;
      store.trash = store.trash.filter((t) => !ids.includes(t.id));
      for (const id of ids) delete store.deletedAt[id];
      commit();
      return before - store.trash.length;
    },

    async purgeNotes(ids) {
      const before = store.trashedNotes.length;
      store.trashedNotes = store.trashedNotes.filter((n) => !ids.includes(n.id));
      for (const id of ids) delete store.deletedAt[id];
      commit();
      return before - store.trashedNotes.length;
    },

    async emptyTrash() {
      const count = store.trash.length + store.trashedNotes.length;
      store.trash = [];
      store.trashedNotes = [];
      store.deletedAt = {};
      commit();
      return count;
    },

    async reopenTask(id, date) {
      const task = taskById(id);
      if (task.categoryId !== CATEGORY.done) throw new Error("Die Aufgabe ist nicht erledigt.");
      const origin = store.categories.some((c) => c.id === task.completedFrom)
        ? (task.completedFrom as string)
        : CATEGORY.inbox;
      applyCategory(task, origin, date);
      task.version += 1;
      task.updatedAt = Date.now();
      commit();
      return structuredClone(task);
    },

    async deleteTask(id) {
      const task = taskById(id);
      store.tasks = store.tasks.filter((t) => t.id !== id);
      store.trash.push(task);
      store.deletedAt[id] = Date.now();
      commit();
    },

    async deleteDoneTasks() {
      const done = store.tasks.filter((t) => t.categoryId === CATEGORY.done);
      store.tasks = store.tasks.filter((t) => t.categoryId !== CATEGORY.done);
      store.trash.push(...done);
      for (const task of done) store.deletedAt[task.id] = Date.now();
      commit();
      return done.map((t) => t.id);
    },

    async restoreTasks(ids) {
      for (const id of ids) {
        const task = store.trash.find((t) => t.id === id);
        if (!task) continue;
        store.trash = store.trash.filter((t) => t.id !== id);
        delete store.deletedAt[id];
        if (!store.categories.some((c) => c.id === task.categoryId)) {
          task.categoryId = CATEGORY.inbox;
          task.plannedDate = null;
        }
        task.version += 1;
        task.updatedAt = Date.now();
        store.tasks.push(task);
      }
      commit();
    },

    async listCategories() {
      return structuredClone([...store.categories].sort(byPosition));
    },

    async createCategory(name) {
      const trimmed = name.trim();
      if (!trimmed) throw new Error("Der Name darf nicht leer sein.");
      if (store.categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())) {
        throw new Error(`Es gibt bereits eine Kategorie "${trimmed}".`);
      }
      const now = Date.now();
      const category: Category = {
        id: crypto.randomUUID(),
        name: trimmed,
        isSystem: false,
        position: Math.max(0, ...store.categories.map((c) => c.position)) + 1,
        version: 1,
        createdAt: now,
        updatedAt: now,
      };
      store.categories.push(category);
      commit();
      return structuredClone(category);
    },

    async deleteCategory(id) {
      const category = store.categories.find((c) => c.id === id);
      if (!category) throw new Error(`Kategorie nicht gefunden: ${id}`);
      if (category.isSystem) throw new Error("Feste Kategorien können nicht entfernt werden.");
      const moved = store.tasks.filter((t) => t.categoryId === id);
      for (const task of moved) {
        task.categoryId = CATEGORY.inbox;
        task.plannedDate = null;
        task.completedAt = null;
        task.version += 1;
        task.updatedAt = Date.now();
      }
      store.categories = store.categories.filter((c) => c.id !== id);
      store.removedCategories.push(category);
      commit();
      return moved.map((t) => t.id);
    },

    async restoreCategory(id, taskIds) {
      const category = store.removedCategories.find((c) => c.id === id);
      if (!category) throw new Error(`Entfernte Kategorie nicht gefunden: ${id}`);
      store.removedCategories = store.removedCategories.filter((c) => c.id !== id);
      store.categories.push(category);
      for (const task of store.tasks) {
        if (taskIds.includes(task.id) && task.categoryId === CATEGORY.inbox) {
          task.categoryId = id;
          task.version += 1;
          task.updatedAt = Date.now();
        }
      }
      commit();
    },

    async updateDailyPlan(date, patch) {
      const plan = planFor(date);
      if (patch.focus !== undefined) plan.focus = patch.focus;
      if (patch.note !== undefined) plan.note = patch.note;
      plan.version += 1;
      plan.updatedAt = Date.now();
      commit();
      return structuredClone(plan);
    },
  };
}
