import { useCallback, useEffect, useRef, useState } from "react";

export type SaveStatus = "idle" | "dirty" | "saving" | "saved" | "error";

/**
 * Sammelt Aenderungen und speichert sie nach einer kurzen Eingabepause, beim Verlassen
 * des Feldes (`flush`) und beim Schliessen. Bei einem Fehler bleiben die Aenderungen
 * erhalten und werden mit der naechsten Eingabe oder per `flush` erneut versucht.
 */
export function useAutosave<T extends object>(save: (patch: T) => Promise<unknown>, delay = 600) {
  const [status, setStatus] = useState<SaveStatus>("idle");
  const [error, setError] = useState<string | null>(null);
  const pending = useRef<T | null>(null);
  const timer = useRef<number | undefined>(undefined);
  const saveRef = useRef(save);

  useEffect(() => {
    saveRef.current = save;
  });

  // Lesen ueber eine Funktion, damit TypeScript nach `await` keinen veralteten Wert annimmt.
  const newest = () => pending.current;

  const flush = useCallback(async () => {
    window.clearTimeout(timer.current);
    const patch = pending.current;
    if (patch === null) return;
    pending.current = null;
    setStatus("saving");
    try {
      await saveRef.current(patch);
      setStatus(newest() === null ? "saved" : "dirty");
      setError(null);
    } catch (e) {
      // Neuere Eingaben haben Vorrang vor dem fehlgeschlagenen Stand.
      pending.current = { ...patch, ...newest() };
      setStatus("error");
      setError(String(e));
    }
  }, []);

  const schedule = useCallback(
    (patch: T) => {
      pending.current = { ...pending.current, ...patch };
      setStatus((current) => (current === "error" ? "error" : "dirty"));
      window.clearTimeout(timer.current);
      timer.current = window.setTimeout(() => void flush(), delay);
    },
    [delay, flush],
  );

  useEffect(
    () => () => {
      void flush();
    },
    [flush],
  );

  return { status, error, schedule, flush };
}
