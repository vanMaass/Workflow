/** IDs der festen Kategorien. Sie haben fachliche Bedeutung (Heute plant ein, Erledigt schliesst ab). */
export const CATEGORY = {
  inbox: "Inbox",
  today: "Heute",
  upcoming: "Demnaechst",
  done: "Erledigt",
} as const;

export interface Category {
  id: string;
  name: string;
  /** Feste Kategorien lassen sich weder entfernen noch umbenennen. */
  isSystem: boolean;
  position: number;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export type Priority = "Hoch" | "Normal" | "Niedrig";

export interface Task {
  id: string;
  title: string;
  /** Eine Aufgabe liegt in genau einer Kategorie. */
  categoryId: string;
  priority: Priority | null;
  durationMinutes: number | null;
  pageId: string | null;
  noteId: string | null;
  /** Lokales Datum (YYYY-MM-DD), fuer das die Aufgabe eingeplant ist. */
  plannedDate: string | null;
  position: number;
  version: number;
  createdAt: number;
  updatedAt: number;
  completedAt: number | null;
  /** Kategorie, aus der die Aufgabe abgehakt wurde (nur bei erledigten Aufgaben). */
  completedFrom: string | null;
}

export interface DailyPlan {
  id: string;
  date: string;
  focus: string;
  note: string;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface TodayView {
  plan: DailyPlan;
  /** Fuer heute eingeplante Aufgaben (offen und erledigt). */
  tasks: Task[];
  /** Offene Aufgaben von frueheren Tagen ("Offen von gestern"). */
  carryover: Task[];
}

export interface CreateTaskInput {
  title: string;
  categoryId: string;
  /** Lokales Datum von heute; wird fuer die Kategorie `Heute` als Plan-Datum genutzt. */
  date: string;
}

export interface DailyPlanPatch {
  focus?: string;
  note?: string;
}

/** Einziger Zugriffspunkt der Oberflaeche auf die lokalen Daten. */
export type Theme = "system" | "light" | "dark";
export type Mode = "easy" | "advanced";
export type Accent = "grau" | "gruen" | "blau" | "violett" | "rot";
export type FontChoice = "system" | "serif" | "mono";

export interface Settings {
  theme: Theme;
  mode: Mode;
  accent: Accent;
  font: FontChoice;
}

export const DEFAULT_SETTINGS: Settings = { theme: "system", mode: "easy", accent: "grau", font: "system" };

/** Eintrag der Notizliste (ohne Inhalt). `title` ist der gesetzte Titel oder die erste Textzeile. */
export interface NoteSummary {
  id: string;
  title: string;
  excerpt: string;
  pinned: boolean;
  createdAt: number;
  updatedAt: number;
}

export interface Note {
  id: string;
  /** Gesetzter Titel; leer, wenn der Titel aus der ersten Textzeile abgeleitet wird. */
  title: string;
  /** Blockbasiertes Editor-Dokument als JSON-Text; leer bei neuen Notizen. */
  content: string;
  /** Reiner Text des Inhalts, fuer Suche und Listenvorschau. */
  plainText: string;
  pinned: boolean;
  pageId: string | null;
  version: number;
  createdAt: number;
  updatedAt: number;
}

export interface NotePatch {
  title?: string;
  content?: string;
  plainText?: string;
  pinned?: boolean;
}

export interface CreateTaskFromNoteInput {
  noteId: string;
  title: string;
  categoryId: string;
  date: string;
}

export interface TrashedTask {
  id: string;
  title: string;
  categoryId: string;
  /** Name der Kategorie, in der die Aufgabe lag (auch wenn sie inzwischen entfernt wurde). */
  categoryName: string | null;
  deletedAt: number;
}

export interface TrashedNote {
  id: string;
  title: string;
  excerpt: string;
  deletedAt: number;
}

export interface Trash {
  tasks: TrashedTask[];
  notes: TrashedNote[];
}

export type HitKind = "task" | "note" | "day";
export type SearchScope = "all" | "title" | "content";

export interface SearchHit {
  kind: HitKind;
  /** ID der Aufgabe bzw. Notiz; bei Tagen das Datum (YYYY-MM-DD). */
  id: string;
  title: string;
  /** Textausschnitt um die Fundstelle (leer bei Aufgaben). */
  excerpt: string;
  categoryId: string | null;
  categoryName: string | null;
  /** Plan-Datum einer Aufgabe bzw. Datum eines Tages. */
  date: string | null;
  titleMatch: boolean;
  updatedAt: number;
}

export interface SearchOptions {
  /** Wo gesucht wird; Standard: Titel und Inhalt. */
  scope?: SearchScope;
  /** Nur diese Arten von Treffern; Standard: alle. */
  kinds?: HitKind[];
}

export interface Api {
  /**
   * Globale Suche ueber Aufgaben, Notizen und Schnellnotizen. Alle Suchbegriffe muessen vorkommen;
   * Titeltreffer zuerst, hoechstens 50 Treffer.
   */
  search(query: string, options?: SearchOptions): Promise<SearchHit[]>;
  /** Geloeschte Aufgaben und Notizen, zuletzt geloeschte zuerst. */
  listTrash(): Promise<Trash>;
  trashCount(): Promise<number>;
  /** Loescht Aufgaben aus dem Papierkorb endgueltig; liefert die Anzahl. */
  purgeTasks(ids: string[]): Promise<number>;
  purgeNotes(ids: string[]): Promise<number>;
  emptyTrash(): Promise<number>;
  /** Angeheftete Notizen zuerst, dann zuletzt bearbeitete. Optional mit Volltextsuche. */
  listNotes(query?: string): Promise<NoteSummary[]>;
  getNote(id: string): Promise<Note>;
  createNote(title?: string): Promise<Note>;
  updateNote(id: string, patch: NotePatch): Promise<Note>;
  /** Loescht in den Papierkorb (wiederherstellbar). */
  deleteNote(id: string): Promise<void>;
  restoreNote(id: string): Promise<void>;
  /** Legt eine mit der Notiz verknuepfte Aufgabe an. */
  createTaskFromNote(input: CreateTaskFromNoteInput): Promise<Task>;
  getSettings(): Promise<Settings>;
  updateSettings(patch: Partial<Settings>): Promise<Settings>;
  listTasks(): Promise<Task[]>;
  getToday(date: string): Promise<TodayView>;
  createTask(input: CreateTaskInput): Promise<Task>;
  moveTask(id: string, categoryId: string, date: string): Promise<Task>;
  /** Holt eine erledigte Aufgabe dorthin zurueck, wo sie abgehakt wurde (sonst Inbox). */
  reopenTask(id: string, date: string): Promise<Task>;
  /** Loescht eine Aufgabe in den Papierkorb (wiederherstellbar). */
  deleteTask(id: string): Promise<void>;
  /** Loescht alle erledigten Aufgaben in den Papierkorb; liefert ihre IDs. */
  deleteDoneTasks(): Promise<string[]>;
  restoreTasks(ids: string[]): Promise<void>;
  listCategories(): Promise<Category[]>;
  createCategory(name: string): Promise<Category>;
  /** Entfernt eine eigene Kategorie; liefert die IDs der in die Inbox verschobenen Aufgaben. */
  deleteCategory(id: string): Promise<string[]>;
  restoreCategory(id: string, taskIds: string[]): Promise<void>;
  updateDailyPlan(date: string, patch: DailyPlanPatch): Promise<DailyPlan>;
}
