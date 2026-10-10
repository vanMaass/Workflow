import { useCallback, useEffect, useMemo, useState } from "react";
import { useApi } from "../api/context";
import type { Note, NoteSummary } from "../api/types";
import { ResizeHandle } from "../components/ResizeHandle";
import { UndoToast, type ToastState } from "../components/UndoToast";
import { useResizableWidth } from "../lib/useResizableWidth";
import { useClipped } from "../lib/useClipped";
import { useTypingMode } from "../lib/useTypingMode";
import { NoteDetail } from "../notes/NoteDetail";

interface Props {
  noteId: string | null;
  onSelect: (id: string | null) => void;
}

const TABS_KEY = "workflow-open-notes";

/** Zuletzt geoeffnete Notiz-Tabs (nur eine Komfortfunktion; unlesbare Werte werden ignoriert). */
function readOpenIds(): string[] {
  try {
    const parsed: unknown = JSON.parse(window.localStorage.getItem(TABS_KEY) ?? "[]");
    return Array.isArray(parsed) ? parsed.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

function NoteItem({ note, active, onSelect }: { note: NoteSummary; active: boolean; onSelect: () => void }) {
  return (
    <li>
      <button
        type="button"
        className={`note-item${active ? " active" : ""}`}
        aria-current={active ? "true" : undefined}
        onClick={onSelect}
      >
        <span className="note-item-title">
          {note.pinned && <span aria-label="angeheftet">★ </span>}
          {note.title}
        </span>
        {note.excerpt && <span className="note-item-excerpt">{note.excerpt}</span>}
      </button>
    </li>
  );
}

export function NotizenView({ noteId, onSelect }: Props) {
  const api = useApi();
  const [query, setQuery] = useState("");
  const [allNotes, setAllNotes] = useState<NoteSummary[] | null>(null);
  const [results, setResults] = useState<NoteSummary[] | null>(null);
  const [openIds, setOpenIds] = useState<string[]>(readOpenIds);
  const [note, setNote] = useState<Note | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const [resizing, setResizing] = useState(false);
  const list = useResizableWidth({
    storageKey: "workflow-notes-list-width",
    initial: 280,
    min: 200,
    max: 420,
  });
  const reload = useCallback(() => setReloadCount((n) => n + 1), []);
  useTypingMode();
  const { ref: listRef, clipped } = useClipped<HTMLDivElement>();

  // Alle Notizen laden: Grundlage der Liste und der Tab-Titel.
  useEffect(() => {
    let cancelled = false;
    api.listNotes().then(
      (loaded) => {
        if (cancelled) return;
        setAllNotes(loaded);
        setError(null);
      },
      (e) => {
        if (!cancelled) setError(`Notizen konnten nicht geladen werden: ${String(e)}`);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api, reloadCount]);

  // Suche; sie wartet kurz, bis die Eingabe pausiert.
  useEffect(() => {
    if (!query.trim()) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      api.listNotes(query).then(
        (loaded) => {
          if (!cancelled) setResults(loaded);
        },
        (e) => {
          if (!cancelled) setError(`Suche fehlgeschlagen: ${String(e)}`);
        },
      );
    }, 250);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [api, query, reloadCount]);

  // Die gewaehlte Notiz laden.
  useEffect(() => {
    if (!noteId) return;
    let cancelled = false;
    api.getNote(noteId).then(
      (loaded) => {
        if (cancelled) return;
        setNote(loaded);
        setError(null);
      },
      (e) => {
        if (!cancelled) setError(`Notiz konnte nicht geladen werden: ${String(e)}`);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api, noteId]);

  // Geoeffnete Tabs: die vom Nutzer geoeffneten plus die aktive Notiz (z. B. aus einer Aufgabe heraus
  // geoeffnet); geloeschte Notizen fallen heraus.
  const tabIds = useMemo(() => {
    const ids = noteId && !openIds.includes(noteId) ? [...openIds, noteId] : openIds;
    return allNotes ? ids.filter((id) => id === noteId || allNotes.some((n) => n.id === id)) : ids;
  }, [openIds, noteId, allNotes]);

  useEffect(() => {
    try {
      window.localStorage.setItem(TABS_KEY, JSON.stringify(tabIds));
    } catch {
      // Nur Komfortfunktion.
    }
  }, [tabIds]);

  const titleOf = (id: string) => allNotes?.find((n) => n.id === id)?.title ?? "Notiz";

  /** Wechselt den aktiven Tab und merkt sich dabei auch einen von aussen geoeffneten Tab. */
  const activate = (id: string | null) => {
    setOpenIds(id && !tabIds.includes(id) ? [...tabIds, id] : tabIds);
    onSelect(id);
  };
  const selectNote = (id: string) => activate(id);

  /** Schliesst einen Tab; war er aktiv, wird der vorherige Tab aktiv, sonst der Startpunkt `Notizen`. */
  const closeTab = (id: string) => {
    const index = tabIds.indexOf(id);
    const rest = tabIds.filter((tabId) => tabId !== id);
    setOpenIds(rest);
    if (id === noteId) onSelect(rest[index - 1] ?? rest[0] ?? null);
  };

  const create = async () => {
    try {
      const created = await api.createNote();
      selectNote(created.id);
      reload();
    } catch (e) {
      setError(`Notiz konnte nicht angelegt werden: ${String(e)}`);
    }
  };

  const remove = async (target: Note) => {
    try {
      await api.deleteNote(target.id);
      closeTab(target.id);
      reload();
      setToast({
        id: Date.now(),
        message: "Notiz gelöscht",
        undo: () => {
          void api.restoreNote(target.id).then(() => {
            selectNote(target.id);
            reload();
          });
        },
      });
    } catch (e) {
      setError(`Notiz konnte nicht gelöscht werden: ${String(e)}`);
    }
  };

  const current = note && note.id === noteId ? note : null;
  // Waehrend die Suche laeuft, bleibt die bisherige Liste sichtbar, statt kurz leer zu flackern.
  const notes = query.trim() ? (results ?? allNotes) : allNotes;
  const pinned = notes?.filter((n) => n.pinned) ?? [];
  const recent = notes?.filter((n) => !n.pinned) ?? [];
  const select = (id: string) => () => selectNote(id);

  return (
    <div className="notizen-layout">
      <div className="note-tabs" role="tablist" aria-label="Geöffnete Notizen">
        <button
          type="button"
          role="tab"
          aria-selected={noteId === null}
          className="note-tab home"
          onClick={() => activate(null)}
        >
          Notizen
        </button>
        {tabIds.map((id) => (
          <div key={id} className={`note-tab${id === noteId ? " active" : ""}`}>
            <button
              type="button"
              role="tab"
              aria-selected={id === noteId}
              className="note-tab-label"
              onClick={() => activate(id)}
            >
              {titleOf(id)}
            </button>
            <button
              type="button"
              className="note-tab-close"
              aria-label={`${titleOf(id)} schließen`}
              onClick={() => closeTab(id)}
            >
              ✕
            </button>
          </div>
        ))}
        <button
          type="button"
          className="note-tab-new"
          aria-label="Neue Notiz im neuen Tab"
          title="Neue Notiz"
          onClick={() => void create()}
        >
          +
        </button>
      </div>
      <div className="notizen-body" style={{ gridTemplateColumns: `${list.width}px 1fr` }}>
        <aside className={`note-list-wrap${resizing ? " resizing" : ""}`} aria-label="Notizliste">
          <div className="note-list" ref={listRef}>
            <header>
              <h2>Notizen</h2>
              <button type="button" className="text-button" onClick={() => void create()}>
                + Neue Notiz
              </button>
            </header>
            <input
              type="search"
              className="add-input"
              aria-label="Notizen durchsuchen"
              placeholder="Suchen …"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            {notes && notes.length === 0 && (
              <p className="hint">
                {query.trim() ? "Keine Treffer." : "Noch keine Notizen. Lege die erste an."}
              </p>
            )}
            {pinned.length > 0 && (
              <>
                <h3 className="list-label">Angeheftet</h3>
                <ul className="note-items">
                  {pinned.map((n) => (
                    <NoteItem key={n.id} note={n} active={n.id === noteId} onSelect={select(n.id)} />
                  ))}
                </ul>
              </>
            )}
            {recent.length > 0 && (
              <>
                <h3 className="list-label">Zuletzt bearbeitet</h3>
                <ul className="note-items">
                  {recent.map((n) => (
                    <NoteItem key={n.id} note={n} active={n.id === noteId} onSelect={select(n.id)} />
                  ))}
                </ul>
              </>
            )}
          </div>
          {clipped && (
            <p className="note-clip-hint" role="note">
              Weitere Notizen über die Suche finden
            </p>
          )}
          <ResizeHandle
            edge="right"
            label="Breite der Notizliste"
            width={list.width}
            min={200}
            max={420}
            onChange={list.setWidth}
            onResizingChange={setResizing}
            onReset={list.reset}
          />
        </aside>

        <main className="note-main" aria-label="Notiz bearbeiten">
          {error && (
            <div className="banner" role="alert">
              {error}
            </div>
          )}
          {current ? (
            <NoteDetail
              key={current.id}
              note={current}
              onSaved={reload}
              onDelete={() => void remove(current)}
            />
          ) : (
            !error && (
              <p className="empty">
                {noteId ? "Notiz wird geladen …" : "Wähle eine Notiz oder lege eine neue an."}
              </p>
            )
          )}
        </main>
      </div>
      {toast && <UndoToast toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}
