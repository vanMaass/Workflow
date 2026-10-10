import { useCallback, useEffect, useState } from "react";
import { useApi } from "../api/context";
import type { Trash } from "../api/types";
import { ConfirmButton } from "../components/ConfirmButton";

const formatDate = (ms: number) =>
  new Intl.DateTimeFormat("de-DE", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).format(
    new Date(ms),
  );

export function TrashView() {
  const api = useApi();
  const [trash, setTrash] = useState<Trash | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    api.listTrash().then(
      (loaded) => {
        if (cancelled) return;
        setTrash(loaded);
        setError(null);
      },
      (e) => {
        if (!cancelled) setError(`Papierkorb konnte nicht geladen werden: ${String(e)}`);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api, reloadCount]);

  const run = async (action: () => Promise<unknown>, done: string) => {
    try {
      await action();
      setMessage(done);
      setError(null);
      reload();
    } catch (e) {
      setError(`Aktion fehlgeschlagen: ${String(e)}`);
    }
  };

  const total = trash ? trash.tasks.length + trash.notes.length : 0;

  return (
    <main className="trash-view" aria-label="Papierkorb">
      <header>
        <h1>Papierkorb</h1>
        {total > 0 && (
          <ConfirmButton
            className="text-button"
            confirmLabel="Wirklich alles endgültig löschen?"
            ariaLabel="Papierkorb leeren"
            onConfirm={() => void run(() => api.emptyTrash(), "Papierkorb geleert.")}
          >
            Papierkorb leeren
          </ConfirmButton>
        )}
      </header>
      <p className="hint">
        Gelöschte Aufgaben und Notizen bleiben hier, bis du sie endgültig löschst. Es gibt keine automatische Frist.
      </p>

      {error && (
        <div className="banner" role="alert">
          {error}
        </div>
      )}
      {message && (
        <p className="hint" role="status">
          {message}
        </p>
      )}

      {trash && total === 0 && !error && <p className="empty">Der Papierkorb ist leer.</p>}

      {trash && trash.tasks.length > 0 && (
        <section aria-labelledby="trash-tasks">
          <h2 id="trash-tasks">Aufgaben ({trash.tasks.length})</h2>
          <ul className="trash-list">
            {trash.tasks.map((task) => (
              <li key={task.id} className="trash-row">
                <span className="trash-title">{task.title}</span>
                <span className="hint">
                  {task.categoryName ? `aus ${task.categoryName} · ` : ""}
                  {formatDate(task.deletedAt)}
                </span>
                <button
                  type="button"
                  className="text-button"
                  aria-label={`${task.title} wiederherstellen`}
                  onClick={() => void run(() => api.restoreTasks([task.id]), "Aufgabe wiederhergestellt.")}
                >
                  Wiederherstellen
                </button>
                <ConfirmButton
                  className="text-button danger"
                  ariaLabel={`${task.title} endgültig löschen`}
                  onConfirm={() => void run(() => api.purgeTasks([task.id]), "Aufgabe endgültig gelöscht.")}
                >
                  Endgültig löschen
                </ConfirmButton>
              </li>
            ))}
          </ul>
        </section>
      )}

      {trash && trash.notes.length > 0 && (
        <section aria-labelledby="trash-notes">
          <h2 id="trash-notes">Notizen ({trash.notes.length})</h2>
          <ul className="trash-list">
            {trash.notes.map((note) => (
              <li key={note.id} className="trash-row">
                <span className="trash-title">
                  {note.title}
                  {note.excerpt && note.excerpt !== note.title && <span className="hint"> – {note.excerpt}</span>}
                </span>
                <span className="hint">{formatDate(note.deletedAt)}</span>
                <button
                  type="button"
                  className="text-button"
                  aria-label={`${note.title} wiederherstellen`}
                  onClick={() => void run(() => api.restoreNote(note.id), "Notiz wiederhergestellt.")}
                >
                  Wiederherstellen
                </button>
                <ConfirmButton
                  className="text-button danger"
                  ariaLabel={`${note.title} endgültig löschen`}
                  onConfirm={() => void run(() => api.purgeNotes([note.id]), "Notiz endgültig gelöscht.")}
                >
                  Endgültig löschen
                </ConfirmButton>
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
