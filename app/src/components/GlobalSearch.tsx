import { useEffect, useRef, useState, type KeyboardEvent } from "react";
import { useApi } from "../api/context";
import type { HitKind, SearchHit, SearchScope } from "../api/types";
import { formatLongDate } from "../lib/date";
import { useSettings } from "../settings/SettingsContext";
import { Highlighted } from "./Highlighted";
import { Segmented } from "./Segmented";

type Filter = "all" | "task" | "note" | "day";

const KIND_LABEL: Record<HitKind, string> = { task: "Aufgabe", note: "Notiz", day: "Schnellnotiz" };

interface Props {
  onClose: () => void;
  onOpenNote: (id: string) => void;
  onOpenTask: (hit: SearchHit) => void;
  onOpenDay: (date: string) => void;
}

/** Welche Arten von Treffern ein Filter umfasst; im Easy Mode gehoeren Schnellnotizen zu `Notizen`. */
function kindsFor(filter: Filter, advanced: boolean): HitKind[] | undefined {
  if (filter === "task") return ["task"];
  if (filter === "day") return ["day"];
  if (filter === "note") return advanced ? ["note"] : ["note", "day"];
  return undefined;
}

export function GlobalSearch({ onClose, onOpenNote, onOpenTask, onOpenDay }: Props) {
  const api = useApi();
  const { settings } = useSettings();
  const advanced = settings.mode === "advanced";
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [scope, setScope] = useState<SearchScope>("all");
  const [hits, setHits] = useState<SearchHit[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  const trimmed = query.trim();
  // Erweiterte Filter gelten nur im Advanced Mode; im Easy Mode wird immer in Titel und Inhalt gesucht.
  const effectiveScope: SearchScope = advanced ? scope : "all";
  const effectiveFilter: Filter = !advanced && filter === "day" ? "note" : filter;

  useEffect(() => input.current?.focus(), []);

  // Die Suche startet kurz nach der letzten Eingabe; bis das Ergebnis da ist, bleibt das bisherige stehen.
  useEffect(() => {
    if (!trimmed) return;
    let cancelled = false;
    const timer = window.setTimeout(() => {
      api.search(trimmed, { scope: effectiveScope, kinds: kindsFor(effectiveFilter, advanced) }).then(
        (found) => {
          if (cancelled) return;
          setHits(found);
          setError(null);
        },
        (e) => {
          if (!cancelled) setError(`Suche fehlgeschlagen: ${String(e)}`);
        },
      );
    }, 150);
    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [api, trimmed, effectiveScope, effectiveFilter, advanced]);

  const shown = trimmed ? (hits ?? []) : [];
  const activeIndex = Math.min(active, Math.max(shown.length - 1, 0));

  const open = (hit: SearchHit) => {
    onClose();
    if (hit.kind === "note") onOpenNote(hit.id);
    else if (hit.kind === "task") onOpenTask(hit);
    else onOpenDay(hit.id);
  };

  const onKeyDown = (e: KeyboardEvent) => {
    if (e.key === "Escape") {
      e.preventDefault();
      onClose();
    } else if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      if (shown.length === 0) return;
      const step = e.key === "ArrowDown" ? 1 : shown.length - 1;
      setActive((activeIndex + step) % shown.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      const hit = shown[activeIndex];
      if (hit) open(hit);
    }
  };

  const filterOptions: { value: Filter; label: string }[] = [
    { value: "all", label: "Alles" },
    { value: "task", label: "Aufgaben" },
    { value: "note", label: "Notizen" },
    ...(advanced ? [{ value: "day" as const, label: "Schnellnotizen" }] : []),
  ];

  return (
    <div className="overlay" onClick={onClose}>
      <div
        className="dialog global-search"
        role="dialog"
        aria-modal="true"
        aria-label="Suche"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={onKeyDown}
      >
        <input
          ref={input}
          type="search"
          className="global-search-input"
          aria-label="Suchbegriff"
          placeholder="Aufgaben, Notizen und Schnellnotizen durchsuchen …"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setActive(0);
          }}
        />
        <div className="global-search-filters">
          <Segmented
            label="Filter"
            value={effectiveFilter}
            options={filterOptions}
            onChange={(value) => {
              setFilter(value);
              setActive(0);
            }}
          />
          {advanced && (
            <Segmented
              label="Suchen in"
              value={scope}
              options={[
                { value: "all", label: "Titel & Inhalt" },
                { value: "title", label: "Titel" },
                { value: "content", label: "Inhalt" },
              ]}
              onChange={(value) => {
                setScope(value);
                setActive(0);
              }}
            />
          )}
        </div>

        {error && (
          <div className="banner" role="alert">
            {error}
          </div>
        )}

        {!trimmed ? (
          <p className="hint">
            Tippe einen Begriff, um alles wiederzufinden. Mehrere Wörter müssen alle vorkommen.
          </p>
        ) : hits && hits.length === 0 ? (
          <p className="hint">Keine Treffer für „{trimmed}“.</p>
        ) : (
          <ul className="global-search-results" role="listbox" aria-label="Suchergebnisse">
            {shown.map((hit, index) => (
              <li key={`${hit.kind}-${hit.id}`} role="presentation">
                <button
                  type="button"
                  role="option"
                  aria-selected={index === activeIndex}
                  className={`search-hit${index === activeIndex ? " active" : ""}`}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => open(hit)}
                >
                  <span className={`hit-kind ${hit.kind}`}>{KIND_LABEL[hit.kind]}</span>
                  <span className="hit-body">
                    <span className="hit-title">
                      <Highlighted
                        text={hit.kind === "day" ? formatLongDate(hit.id) : hit.title}
                        query={hit.kind === "day" ? "" : trimmed}
                      />
                    </span>
                    {hit.excerpt && (
                      <span className="hit-excerpt">
                        <Highlighted text={hit.excerpt} query={trimmed} />
                      </span>
                    )}
                  </span>
                  <span className="hit-meta">
                    {hit.kind === "task" && (hit.categoryName ?? "")}
                    {hit.kind === "task" && hit.date ? ` · ${hit.date}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {shown.length >= 50 && (
          <p className="hint">Es werden die ersten 50 Treffer gezeigt. Grenze die Suche weiter ein.</p>
        )}
        <p className="hint global-search-keys">↑ ↓ wählen · Enter öffnen · Esc schließen</p>
      </div>
    </div>
  );
}
