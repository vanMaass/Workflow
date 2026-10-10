import { useEffect, useState } from "react";

/** Wahrheitswert, der lokal gemerkt wird (z. B. eingeklappte Leiste). */
export function usePersistentFlag(storageKey: string, initial = false) {
  const [value, setValue] = useState(() => {
    try {
      const stored = window.localStorage.getItem(storageKey);
      if (stored !== null) return stored === "true";
    } catch {
      // Speicher nicht verfuegbar: Standardwert.
    }
    return initial;
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(storageKey, String(value));
    } catch {
      // Nur Komfortfunktion.
    }
  }, [storageKey, value]);

  return [value, setValue] as const;
}
