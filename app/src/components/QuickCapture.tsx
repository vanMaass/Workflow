import { useEffect, useRef, useState } from "react";
import { useApi } from "../api/context";
import { CATEGORY } from "../api/types";
import { toDateString } from "../lib/date";
import { useOpenNote } from "../lib/OpenNoteContext";

interface Props {
  onClose: () => void;
}

type Kind = "task" | "note";

/** Globale Schnellerfassung: Aufgaben landen in der Inbox, Notizen oeffnen sich sofort zum Schreiben. */
export function QuickCapture({ onClose }: Props) {
  const api = useApi();
  const openNote = useOpenNote();
  const [kind, setKind] = useState<Kind>("task");
  const [title, setTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => input.current?.focus(), []);

  const submit = async () => {
    // Eine Notiz darf leer beginnen; eine Aufgabe braucht einen Titel.
    if (kind === "task" && !title.trim()) return;
    try {
      if (kind === "task") {
        await api.createTask({ title, categoryId: CATEGORY.inbox, date: toDateString(new Date()) });
      } else {
        const note = await api.createNote(title.trim() || undefined);
        openNote(note.id);
      }
      onClose();
    } catch (e) {
      setError(String(e));
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="dialog"
        role="dialog"
        aria-label="Schnellerfassung"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        <div role="group" aria-label="Art der Erfassung" className="segmented capture-kind">
          <button type="button" aria-pressed={kind === "task"} onClick={() => setKind("task")}>
            Aufgabe
          </button>
          <button type="button" aria-pressed={kind === "note"} onClick={() => setKind("note")}>
            Notiz
          </button>
        </div>
        <input
          ref={input}
          className="capture-input"
          type="text"
          aria-label={kind === "task" ? "Neue Aufgabe" : "Titel der neuen Notiz"}
          placeholder={
            kind === "task" ? "Neue Aufgabe (landet in der Inbox) ..." : "Titel der Notiz (optional) ..."
          }
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && void submit()}
        />
        {error && <p className="error-text">{error}</p>}
        <p className="hint">Enter zum Speichern, Esc zum Schliessen</p>
      </div>
    </div>
  );
}
