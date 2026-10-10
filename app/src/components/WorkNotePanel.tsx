import { useCallback, useEffect, useState } from "react";
import { useApi } from "../api/context";
import type { NoteSummary } from "../api/types";
import { formatLongDate } from "../lib/date";
import { NotePanel } from "../notes/NotePanel";
import { AutoSaveText } from "./AutoSaveText";
import { NotePicker, QUICK_NOTE } from "./NotePicker";

const CHOICE_KEY = "workflow-work-note";
const QUICK = QUICK_NOTE;

/** Die gewaehlte Arbeitsnotiz gilt nur fuer den Tag, an dem sie gewaehlt wurde; danach gilt wieder die Schnellnotiz. */
function readChoice(date: string): string {
  try {
    const stored: unknown = JSON.parse(window.localStorage.getItem(CHOICE_KEY) ?? "null");
    if (stored && typeof stored === "object" && "date" in stored && "id" in stored) {
      if (stored.date === date && typeof stored.id === "string") return stored.id;
    }
  } catch {
    // Unlesbare Auswahl: Schnellnotiz.
  }
  return QUICK;
}

function persistChoice(date: string, id: string) {
  try {
    window.localStorage.setItem(CHOICE_KEY, JSON.stringify({ date, id }));
  } catch {
    // Nur Komfortfunktion.
  }
}

interface QuickNoteProps {
  initialValue: string;
  onSave: (text: string) => void;
  onSaveAsNote: (text: string) => void;
}

/** Schnellnotiz: jeden Tag neu und leer; Wichtiges laesst sich als eigene Notiz sichern. */
function QuickNote({ initialValue, onSave, onSaveAsNote }: QuickNoteProps) {
  const [text, setText] = useState(initialValue);
  return (
    <div className="quick-note">
      <AutoSaveText
        multiline
        label="Schnellnotiz"
        placeholder="Schnellnotiz für heute – morgen ist sie wieder leer"
        initialValue={initialValue}
        onTextChange={setText}
        onSave={onSave}
      />
      {text.trim() !== "" && (
        <button type="button" className="text-button" onClick={() => onSaveAsNote(text)}>
          Als Notiz sichern
        </button>
      )}
    </div>
  );
}

interface Props {
  date: string;
  /** Text der Schnellnotiz dieses Tages. */
  quickNote: string;
  onSaveQuick: (text: string) => void;
  /** Aufgaben haben sich geaendert (z. B. aus der Notiz heraus angelegt). */
  onTasksChanged: () => void;
}

export function WorkNotePanel({ date, quickNote, onSaveQuick, onTasksChanged }: Props) {
  const api = useApi();
  const [chosen, setChosen] = useState(() => ({ date, id: readChoice(date) }));
  const [notes, setNotes] = useState<NoteSummary[] | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    api.listNotes().then(
      (loaded) => {
        if (!cancelled) setNotes(loaded);
      },
      () => {
        // Ohne Liste bleibt die Schnellnotiz nutzbar.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api]);

  const choice = chosen.date === date ? chosen.id : QUICK;
  const select = useCallback(
    (id: string) => {
      setChosen({ date, id });
      persistChoice(date, id);
    },
    [date],
  );
  const missing = useCallback(() => select(QUICK), [select]);

  const saveAsNote = async (text: string) => {
    try {
      const note = await api.createNote(`Schnellnotiz ${formatLongDate(date)}`);
      const doc = {
        type: "doc",
        content: text
          .split("\n")
          .map((line) =>
            line ? { type: "paragraph", content: [{ type: "text", text: line }] } : { type: "paragraph" },
          ),
      };
      await api.updateNote(note.id, { content: JSON.stringify(doc), plainText: text });
      onSaveQuick("");
      setNotes(await api.listNotes());
      select(note.id);
      setError(null);
    } catch (e) {
      setError(`Notiz konnte nicht angelegt werden: ${String(e)}`);
    }
  };

  // Eine geloeschte oder unbekannte Auswahl faellt auf die Schnellnotiz zurueck.
  const effective = choice === QUICK || (notes && !notes.some((n) => n.id === choice)) ? QUICK : choice;

  return (
    <div className="work-note">
      <NotePicker value={effective} notes={notes} onSelect={select} />
      {error && (
        <div className="banner" role="alert">
          {error}
        </div>
      )}
      {effective === QUICK ? (
        <QuickNote
          key={date}
          initialValue={quickNote}
          onSave={onSaveQuick}
          onSaveAsNote={(text) => void saveAsNote(text)}
        />
      ) : (
        <NotePanel key={effective} noteId={effective} onMissing={missing} onTaskCreated={onTasksChanged} />
      )}
    </div>
  );
}
