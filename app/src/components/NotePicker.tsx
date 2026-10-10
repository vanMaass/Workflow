import { useId, useRef, useState, type KeyboardEvent } from "react";
import { createPortal } from "react-dom";
import type { NoteSummary } from "../api/types";

/** ID der Schnellnotiz in der Auswahl (keine echte Notiz). */
export const QUICK_NOTE = "quick";
const QUICK_LABEL = "Schnellnotiz (heute)";

interface Props {
  /** `QUICK_NOTE` oder die ID einer Notiz. */
  value: string;
  notes: NoteSummary[] | null;
  onSelect: (id: string) => void;
}

interface Entry {
  id: string;
  label: string;
  excerpt?: string;
  pinned?: boolean;
}

/** Zentriertes Auswahlfenster fuer die Arbeitsnotiz: Schnellnotiz zuerst, darunter vorhandene Notizen mit Suche. */
export function NotePicker({ value, notes, onSelect }: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const trigger = useRef<HTMLButtonElement>(null);
  const search = useRef<HTMLInputElement>(null);
  const listId = useId();

  const q = query.trim().toLowerCase();
  const entries: Entry[] = [
    ...(!q || QUICK_LABEL.toLowerCase().includes(q) ? [{ id: QUICK_NOTE, label: QUICK_LABEL }] : []),
    ...(notes ?? [])
      .filter((n) => !q || n.title.toLowerCase().includes(q) || n.excerpt.toLowerCase().includes(q))
      .map((n) => ({ id: n.id, label: n.title, excerpt: n.excerpt, pinned: n.pinned })),
  ];
  const activeIndex = Math.min(active, Math.max(entries.length - 1, 0));
  const current = value === QUICK_NOTE ? QUICK_LABEL : (notes?.find((n) => n.id === value)?.title ?? "Notiz");

  const openPopup = () => {
    setQuery("");
    setActive(0);
    setOpen(true);
    // Das Suchfeld existiert erst nach dem Rendern.
    window.setTimeout(() => search.current?.focus(), 0);
  };

  const close = () => {
    setOpen(false);
    trigger.current?.focus();
  };

  const choose = (id: string) => {
    onSelect(id);
    close();
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      close();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (entries.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : entries.length - 1;
      setActive((activeIndex + step) % entries.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const entry = entries[activeIndex];
      if (entry) choose(entry.id);
    }
  };

  return (
    <div className="note-picker">
      <button
        ref={trigger}
        type="button"
        className="note-picker-trigger"
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Arbeitsnotiz wählen: ${current}`}
        onClick={openPopup}
      >
        <span className="note-picker-current">{current}</span>
        <span aria-hidden="true">▾</span>
      </button>

      {open &&
        createPortal(
          <div className="overlay center" onClick={close}>
            <div
              className="dialog note-picker-dialog"
              role="dialog"
              aria-modal="true"
              aria-labelledby={`${listId}-title`}
              onClick={(e) => e.stopPropagation()}
              onKeyDown={onKeyDown}
            >
              <header className="settings-header">
                <h2 id={`${listId}-title`}>Arbeitsnotiz wählen</h2>
                <button type="button" className="icon-button" aria-label="Schließen" onClick={close}>
                  ✕
                </button>
              </header>
              <input
                ref={search}
                type="search"
                className="note-picker-search"
                aria-label="Notiz suchen"
                placeholder="Notiz suchen …"
                aria-controls={listId}
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setActive(0);
                }}
              />
              <ul id={listId} role="listbox" aria-label="Notizen" className="note-picker-list">
                {entries.map((entry, index) => (
                  <li key={entry.id} role="presentation">
                    <button
                      type="button"
                      role="option"
                      aria-selected={entry.id === value}
                      className={`note-picker-item${index === activeIndex ? " active" : ""}${entry.id === value ? " current" : ""}`}
                      onMouseEnter={() => setActive(index)}
                      onClick={() => choose(entry.id)}
                    >
                      <span className="note-picker-title">
                        {entry.pinned && <span aria-label="angeheftet">★ </span>}
                        {entry.label}
                      </span>
                      {entry.excerpt && <span className="note-picker-excerpt">{entry.excerpt}</span>}
                    </button>
                  </li>
                ))}
                {entries.length === 0 && <li className="hint note-picker-empty">Keine Treffer.</li>}
              </ul>
            </div>
          </div>,
          document.body,
        )}
    </div>
  );
}
