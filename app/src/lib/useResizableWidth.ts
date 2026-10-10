import { useCallback, useEffect, useState } from "react";

export const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

interface Options {
  /** Schluessel fuer die lokal gemerkte Breite. */
  storageKey: string;
  initial: number;
  min: number;
  max: number;
}

/** Breite eines Seitenbereichs, begrenzt auf [min, max] und lokal gemerkt. */
export function useResizableWidth({ storageKey, initial, min, max }: Options) {
  const [width, setWidthState] = useState(() => {
    try {
      const stored = Number(window.localStorage.getItem(storageKey));
      if (Number.isFinite(stored) && stored > 0) return clamp(stored, min, max);
    } catch {
      // Speicher nicht verfuegbar: Standardbreite verwenden.
    }
    return initial;
  });

  const setWidth = useCallback((value: number) => setWidthState(clamp(value, min, max)), [min, max]);

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, String(width));
    } catch {
      // Nur eine Komfortfunktion; Fehler sind unkritisch.
    }
  }, [storageKey, width]);

  return { width, setWidth, reset: () => setWidth(initial) };
}
