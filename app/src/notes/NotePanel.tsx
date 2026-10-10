import { lazy, Suspense, useEffect, useState } from "react";
import { useApi } from "../api/context";
import type { Note } from "../api/types";
import { toDateString } from "../lib/date";
import { useOpenNote } from "../lib/OpenNoteContext";
import { useAutosave } from "../lib/useAutosave";
import type { TaskTarget } from "./NoteEditor";

// Der Editor wird erst gebraucht, wenn eine Notiz im Panel geoeffnet wird.
const NoteEditor = lazy(() => import("./NoteEditor"));

interface BodyProps {
  note: Note;
  onTaskCreated: () => void;
}

/** Kompakte Bearbeitung einer vorhandenen Notiz neben dem Tagesplan. */
function NotePanelBody({ note, onTaskCreated }: BodyProps) {
  const api = useApi();
  const openNote = useOpenNote();
  const [title, setTitle] = useState(note.title);
  const [message, setMessage] = useState<string | null>(null);
  const { status, error, schedule, flush } = useAutosave<{
    title?: string;
    content?: string;
    plainText?: string;
  }>((patch) => api.updateNote(note.id, patch));

  const createTask = async (text: string, target: TaskTarget) => {
    try {
      await api.createTaskFromNote({
        noteId: note.id,
        title: text,
        categoryId: target,
        date: toDateString(new Date()),
      });
      setMessage(`Aufgabe „${text}“ angelegt (${target}).`);
      onTaskCreated();
    } catch (e) {
      setMessage(`Aufgabe konnte nicht angelegt werden: ${String(e)}`);
    }
  };

  return (
    <div className="note-panel">
      {error && (
        <div className="banner" role="alert">
          Änderungen konnten nicht gesichert werden: {error}
        </div>
      )}
      <input
        type="text"
        className="note-panel-title"
        aria-label="Titel der Notiz"
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
      <div className="note-panel-footer">
        <span className="save-status" aria-live="polite">
          {status === "saved" ? "Lokal gespeichert" : status === "saving" ? "Speichert …" : ""}
        </span>
        <button type="button" className="text-button" onClick={() => openNote(note.id)}>
          In Notizen öffnen
        </button>
      </div>
    </div>
  );
}

interface Props {
  noteId: string;
  /** Die Notiz konnte nicht geladen werden (z. B. geloescht): der Aufrufer waehlt etwas anderes. */
  onMissing: () => void;
  onTaskCreated: () => void;
}

export function NotePanel({ noteId, onMissing, onTaskCreated }: Props) {
  const api = useApi();
  const [note, setNote] = useState<Note | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.getNote(noteId).then(
      (loaded) => {
        if (!cancelled) setNote(loaded);
      },
      () => {
        if (!cancelled) onMissing();
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api, noteId, onMissing]);

  if (!note || note.id !== noteId) return <p className="hint">Notiz wird geladen …</p>;
  return <NotePanelBody key={note.id} note={note} onTaskCreated={onTaskCreated} />;
}
