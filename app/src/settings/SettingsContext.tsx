import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useApi } from "../api/context";
import { DEFAULT_SETTINGS, type Settings } from "../api/types";
import { ACCENTS, FONTS } from "./options";

const CACHE_KEY = "workflow-settings-cache";
const DARK_QUERY = "(prefers-color-scheme: dark)";

/** Zuletzt bekannte Einstellungen: nur fuer den ersten Bildaufbau ohne Flackern. */
function readCache(): Settings {
  try {
    const raw = window.localStorage.getItem(CACHE_KEY);
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
  } catch {
    // Kein Cache verfuegbar: Standardwerte.
  }
  return DEFAULT_SETTINGS;
}

function writeCache(settings: Settings) {
  try {
    window.localStorage.setItem(CACHE_KEY, JSON.stringify(settings));
  } catch {
    // Nur Komfortfunktion.
  }
}

function useSystemDark(): boolean {
  return useSyncExternalStore(
    (notify) => {
      const query = window.matchMedia?.(DARK_QUERY);
      query?.addEventListener("change", notify);
      return () => query?.removeEventListener("change", notify);
    },
    () => window.matchMedia?.(DARK_QUERY).matches ?? false,
  );
}

interface SettingsContextValue {
  settings: Settings;
  /** Letzter Speicherfehler, falls eine Aenderung nicht gesichert werden konnte. */
  error: string | null;
  update: (patch: Partial<Settings>) => Promise<void>;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const api = useApi();
  const [settings, setSettings] = useState<Settings>(readCache);
  const [error, setError] = useState<string | null>(null);
  const systemDark = useSystemDark();

  useEffect(() => {
    let cancelled = false;
    api.getSettings().then(
      (loaded) => {
        if (cancelled) return;
        setSettings(loaded);
        writeCache(loaded);
      },
      (e) => {
        if (!cancelled) setError(`Einstellungen konnten nicht geladen werden: ${String(e)}`);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api]);

  const dark = settings.theme === "dark" || (settings.theme === "system" && systemDark);

  useLayoutEffect(() => {
    const root = document.documentElement;
    const accent = ACCENTS[settings.accent];
    root.dataset.theme = dark ? "dark" : "light";
    root.dataset.mode = settings.mode;
    root.style.setProperty("--accent", dark ? accent.dark : accent.light);
    root.style.setProperty("--on-accent", dark ? "#1f1f1e" : "#ffffff");
    root.style.setProperty("--font-ui", FONTS[settings.font].stack);
  }, [settings, dark]);

  const update = useCallback(
    async (patch: Partial<Settings>) => {
      const previous = settings;
      const next = { ...settings, ...patch };
      setSettings(next);
      writeCache(next);
      try {
        const saved = await api.updateSettings(patch);
        setSettings(saved);
        writeCache(saved);
        setError(null);
      } catch (e) {
        setSettings(previous);
        writeCache(previous);
        setError(`Einstellung konnte nicht gespeichert werden: ${String(e)}`);
      }
    },
    [api, settings],
  );

  return <SettingsContext.Provider value={{ settings, error, update }}>{children}</SettingsContext.Provider>;
}

export function useSettings(): SettingsContextValue {
  const value = useContext(SettingsContext);
  if (!value) throw new Error("useSettings braucht einen SettingsProvider");
  return value;
}
