export type ViewId = "heute" | "aufgaben" | "notizen" | "archiv" | "papierkorb";

/** Tastenkuerzel der Suche, passend zum System. */
const SHORTCUT =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘K" : "Strg K";

/** Tastenkuerzel der Schnellerfassung, passend zum System. */
const CAPTURE_SHORTCUT =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘N" : "Strg N";

const ITEMS: { id: ViewId; label: string }[] = [
  { id: "heute", label: "Heute" },
  { id: "aufgaben", label: "Aufgaben" },
  { id: "notizen", label: "Notizen" },
  { id: "archiv", label: "Archiv" },
];

interface Props {
  active: ViewId;
  onSelect: (view: ViewId) => void;
  onCapture: () => void;
  onSearch: () => void;
  onSettings: () => void;
  onCollapse: () => void;
  /** Anzahl der Eintraege im Papierkorb; 0 blendet den Zaehler aus. */
  trashCount?: number;
}

export function Navigation({
  active,
  onSelect,
  onCapture,
  onSearch,
  onSettings,
  onCollapse,
  trashCount = 0,
}: Props) {
  return (
    <nav className="navigation" aria-label="Hauptnavigation">
      <button
        type="button"
        className="icon-button nav-collapse"
        aria-label="Navigation einklappen"
        onClick={onCollapse}
      >
        ←
      </button>
      <button type="button" className="search-bar" onClick={onSearch}>
        <span aria-hidden="true">⌕</span>
        <span className="search-bar-label">Suchen</span>
        <kbd>{SHORTCUT}</kbd>
      </button>
      <button
        type="button"
        className="capture-item"
        aria-label="Erfassen"
        title={`Erfassen (${CAPTURE_SHORTCUT})`}
        onClick={onCapture}
      >
        <span className="plus" aria-hidden="true">
          +
        </span>
        <span className="capture-item-label" aria-hidden="true">
          Erfassen
        </span>
        <kbd aria-hidden="true">{CAPTURE_SHORTCUT}</kbd>
      </button>
      {ITEMS.map((item) => (
        <button
          key={item.id}
          type="button"
          className={`nav-item${item.id === active ? " active" : ""}`}
          aria-current={item.id === active ? "page" : undefined}
          onClick={() => onSelect(item.id)}
        >
          {item.label}
        </button>
      ))}
      <div className="nav-footer">
        <button
          type="button"
          className={`nav-item${active === "papierkorb" ? " active" : ""}`}
          aria-current={active === "papierkorb" ? "page" : undefined}
          onClick={() => onSelect("papierkorb")}
        >
          <span aria-hidden="true">🗑︎</span> Papierkorb
          {trashCount > 0 && (
            <>
              {" "}
              <span className="nav-badge">{trashCount}</span>
            </>
          )}
        </button>
        <button type="button" className="nav-item settings-button" onClick={onSettings}>
          <span aria-hidden="true">⚙︎</span> Einstellungen
        </button>
      </div>
    </nav>
  );
}
