import { useEffect, useRef, useState } from "react";
import { useApi } from "../api/context";
import type { DailyPlan } from "../api/types";
import { formatLongDate } from "../lib/date";
import { useOpenNote } from "../lib/OpenNoteContext";

interface Props {
  date: string;
  onClose: () => void;
}

/** Zeigt die Schnellnotiz eines vergangenen Tages; sie laesst sich als eigene Notiz sichern. */
export function DayNoteDialog({ date, onClose }: Props) {
  const api = useApi();
  const openNote = useOpenNote();
  const [plan, setPlan] = useState<DailyPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const close = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    let cancelled = false;
    api.getToday(date).then(
      (view) => {
        if (!cancelled) setPlan(view.plan);
      },
      (e) => {
        if (!cancelled) setError(`Schnellnotiz konnte nicht geladen werden: ${String(e)}`);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api, date]);

  useEffect(() => close.current?.focus(), []);

  const saveAsNote = async () => {
    if (!plan) return;
    try {
      const text = plan.focus ? `${plan.focus}\n${plan.note}` : plan.note;
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
      onClose();
      openNote(note.id);
    } catch (e) {
      setError(`Notiz konnte nicht angelegt werden: ${String(e)}`);
    }
  };

  return (
    <div className="overlay center" onClick={onClose}>
      <div
        className="dialog day-note-dialog"
        role="dialog"
        aria-modal="true"
        aria-label={`Schnellnotiz vom ${formatLongDate(date)}`}
        onClick={(e) => e.stopPropagation()}
        onKeyDown={(e) => e.key === "Escape" && onClose()}
      >
        <header className="settings-header">
          <h2>Schnellnotiz · {formatLongDate(date)}</h2>
          <button ref={close} type="button" className="icon-button" aria-label="Schließen" onClick={onClose}>
            ✕
          </button>
        </header>
        {error && (
          <div className="banner" role="alert">
            {error}
          </div>
        )}
        {plan && (
          <>
            {plan.focus && (
              <p>
                <span className="hint">Fokus: </span>
                {plan.focus}
              </p>
            )}
            <p className="day-note-text">{plan.note || "Keine Notiz."}</p>
            <div className="day-note-actions">
              <button type="button" className="text-button" onClick={() => void saveAsNote()}>
                Als Notiz sichern
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
