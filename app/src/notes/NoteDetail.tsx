import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import { useApi } from "../api/context";
import { CATEGORY, type Category, type Note, type NotePatch, type Task } from "../api/types";
import { TaskRow } from "../components/TaskRow";
import { toDateString } from "../lib/date";
import { useAutosave, type SaveStatus } from "../lib/useAutosave";
import type { TaskTarget } from "./NoteEditor";

// Der Editor ist ein schweres Paket und wird erst beim Oeffnen einer Notiz geladen.
const NoteEditor = lazy(() => import("./NoteEditor"));

const STATUS_TEXT: Record<SaveStatus, string> = {
  idle: "",
  dirty: "Nicht gespeichert …",
  saving: "Speichert …",
  saved: "Lokal gespeichert",
  error: "",
};

interface Props {
  note: Note;
  /** Nach jedem erfolgreichen Speichern, damit die Liste Titel und Reihenfolge aktualisiert. */
  onSaved: () => void;
  onDelete: () => void;
}

export function NoteDetail({ note, onSaved, onDelete }: Props) {
  const api = useApi();
  const [title, setTitle] = useState(note.title);
  const [pinned, setPinned] = useState(note.pinned);
  const [message, setMessage] = useState<string | null>(null);
  const [linked, setLinked] = useState<{ tasks: Task[]; categories: Category[] }>({
    tasks: [],
    categories: [],
  });
  const [linkedReload, setLinkedReload] = useState(0);

  const { status, error, schedule, flush } = useAutosave<NotePatch>(async (patch) => {
    await api.updateNote(note.id, patch);
    onSaved();
  });

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.listTasks(), api.listCategories()]).then(
      ([tasks, categories]) => {
        if (!cancelled) setLinked({ tasks: tasks.filter((t) => t.noteId === note.id), categories });
      },
      () => {
        // Verknuepfte Aufgaben sind nur eine Zusatzansicht; die Notiz bleibt nutzbar.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api, note.id, linkedReload]);

  const reloadLinked = useCallback(() => setLinkedReload((n) => n + 1), []);

  const createTask = async (text: string, target: TaskTarget) => {
    try {
      await api.createTaskFromNote({
        noteId: note.id,
        title: text,
        categoryId: target,
        date: toDateString(new Date()),
      });
      setMessage(`Aufgabe „${text}“ angelegt (${target === "Heute" ? "Heute" : "Inbox"}).`);
      reloadLinked();
    } catch (e) {
      setMessage(`Aufgabe konnte nicht angelegt werden: ${String(e)}`);
    }
  };

  const toggleDone = async (task: Task) => {
    const today = toDateString(new Date());
    try {
      if (task.categoryId === CATEGORY.done) await api.reopenTask(task.id, today);
      else await api.moveTask(task.id, CATEGORY.done, today);
      reloadLinked();
    } catch (e) {
      setMessage(`Änderung konnte nicht gespeichert werden: ${String(e)}`);
    }
  };

  const togglePin = () => {
    const next = !pinned;
    setPinned(next);
    schedule({ pinned: next });
    void flush();
  };

  const categoryName = (id: string) => linked.categories.find((c) => c.id === id)?.name ?? id;

  return (
    <section className="note-detail" aria-label="Notiz">
      {error && (
        <div className="banner" role="alert">
          Änderungen konnten nicht gesichert werden: {error} Der Text bleibt sichtbar; die Speicherung wird
          bei der nächsten Eingabe erneut versucht.
        </div>
      )}
      <div className="note-actions">
        <span className="save-status" aria-live="polite">
          {STATUS_TEXT[status]}
        </span>
        <button
          type="button"
          className="text-button"
          aria-pressed={pinned}
          onClick={togglePin}
          title="Angeheftete Notizen stehen oben in der Liste"
        >
          {pinned ? "★ Angeheftet" : "☆ Anheften"}
        </button>
        <button
          type="button"
          className="text-button"
          onClick={() => {
            void flush().then(onDelete);
          }}
        >
          Löschen
        </button>
      </div>
      <input
        autoFocus={note.title === "" && note.content === ""}
        type="text"
        className="note-title"
        aria-label="Titel"
        placeholder="Titel (sonst die erste Zeile)"
        value={title}
        onChange={(e) => {
          setTitle(e.target.value);
          schedule({ title: e.target.value });
        }}
        onBlur={() => void flush()}
      />

      <Suspense fallback={<p className="hint">Editor wird geladen …</p>}>
        <NoteEditor
          content={note.content}
          onChange={(content, plainText) => schedule({ content, plainText })}
          onCreateTask={(text, target) => void createTask(text, target)}
        />
      </Suspense>

      {message && (
        <p className="hint" role="status">
          {message}
        </p>
      )}

      <section className="linked-tasks" aria-label="Verknüpfte Aufgaben">
        <h2>Verknüpfte Aufgaben</h2>
        {linked.tasks.length === 0 ? (
          <p className="hint">Noch keine. Zeile anklicken und „Als Aufgabe …“ wählen.</p>
        ) : (
          <ul className="task-list">
            {linked.tasks.map((task) => (
              <TaskRow
                key={task.id}
                task={task}
                hideNoteLink
                onToggle={(t) => void toggleDone(t)}
                actions={<span className="hint">{categoryName(task.categoryId)}</span>}
              />
            ))}
          </ul>
        )}
      </section>
    </section>
  );
}
