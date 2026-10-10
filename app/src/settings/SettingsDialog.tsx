import { useEffect, useRef } from "react";
import { Segmented } from "../components/Segmented";
import { ACCENTS, FONTS } from "./options";
import { useSettings } from "./SettingsContext";

interface Props {
  onClose: () => void;
}

const COMING_SOON = ["Profil", "Benachrichtigungen"];

export function SettingsDialog({ onClose }: Props) {
  const { settings, error, update } = useSettings();
  const closeButton = useRef<HTMLButtonElement>(null);

  const close = useRef(onClose);
  useEffect(() => {
    close.current = onClose;
  });

  useEffect(() => {
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && close.current();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const advanced = settings.mode === "advanced";

  return (
    <div className="overlay center" onClick={onClose}>
      <div
        className="dialog settings"
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-title"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="settings-header">
          <h2 id="settings-title">Einstellungen</h2>
          <button ref={closeButton} type="button" className="icon-button" aria-label="Schließen" onClick={onClose}>
            ✕
          </button>
        </header>

        {error && (
          <div className="banner" role="alert">
            {error}
          </div>
        )}

        <div className="settings-row">
          <span className="settings-label">Erscheinungsbild</span>
          <Segmented
            label="Erscheinungsbild"
            value={settings.theme}
            onChange={(theme) => void update({ theme })}
            options={[
              { value: "light", label: "Hell" },
              { value: "dark", label: "Dunkel" },
              { value: "system", label: "Automatisch" },
            ]}
          />
          <p className="hint">„Automatisch“ folgt der Einstellung deines Systems.</p>
        </div>

        <div className="settings-row">
          <span className="settings-label">Farbe</span>
          <Segmented
            label="Akzentfarbe"
            value={settings.accent}
            onChange={(accent) => void update({ accent })}
            options={(Object.keys(ACCENTS) as (keyof typeof ACCENTS)[]).map((key) => ({
              value: key,
              label: ACCENTS[key].label,
              adornment: <span className="swatch" style={{ background: ACCENTS[key].light }} />,
            }))}
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">Schriftart</span>
          <Segmented
            label="Schriftart"
            value={settings.font}
            onChange={(font) => void update({ font })}
            options={(Object.keys(FONTS) as (keyof typeof FONTS)[]).map((key) => ({
              value: key,
              label: FONTS[key].label,
              style: { fontFamily: FONTS[key].stack },
            }))}
          />
        </div>

        <div className="settings-row switch-row">
          <div>
            <span className="settings-label">Advanced Mode</span>
            <p className="hint">Zeigt zusätzliche Planungsfunktionen. Deine Daten bleiben unverändert.</p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={advanced}
            aria-label="Advanced Mode"
            className="switch"
            onClick={() => void update({ mode: advanced ? "easy" : "advanced" })}
          />
        </div>

        <div className="settings-row">
          <span className="settings-label">Bald verfügbar</span>
          <ul className="coming-soon">
            {COMING_SOON.map((name) => (
              <li key={name}>{name}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
}
