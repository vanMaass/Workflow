import { useCallback, useEffect, useMemo, useState } from "react";
import { ResizeHandle } from "./components/ResizeHandle";
import { toDateString } from "./lib/date";
import { usePersistentFlag } from "./lib/usePersistentFlag";
import { useResizableWidth } from "./lib/useResizableWidth";
import { SettingsDialog } from "./settings/SettingsDialog";
import { Navigation, type ViewId } from "./components/Navigation";
import { DayNoteDialog } from "./components/DayNoteDialog";
import { GlobalSearch } from "./components/GlobalSearch";
import { QuickCapture } from "./components/QuickCapture";
import { AufgabenView } from "./views/AufgabenView";
import { ApiContext, useApi } from "./api/context";
import { trackMutations } from "./lib/trackMutations";
import { HeuteView } from "./views/HeuteView";
import { TrashView } from "./views/TrashView";
import { NotizenView } from "./views/NotizenView";
import { OpenNoteContext } from "./lib/OpenNoteContext";
import { Platzhalter } from "./views/Platzhalter";

/** Breite der schmalen Spalte, die bei eingeklappter Navigation den Ausklapp-Pfeil aufnimmt. */
const NAV_RAIL_WIDTH = 36;

const TITLES: Record<"archiv", string> = {
  archiv: "Archiv",
};

export function App() {
  const [view, setView] = useState<ViewId>("heute");
  const [capturing, setCapturing] = useState(false);
  const [noteId, setNoteId] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [dayPreview, setDayPreview] = useState<string | null>(null);
  // Ziel einer gefundenen Aufgabe; `nonce` baut die Aufgabenansicht beim erneuten Oeffnen neu auf.
  const [taskTarget, setTaskTarget] = useState<{
    categoryId: string | null;
    taskId: string;
    nonce: number;
  } | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [navCollapsed, setNavCollapsed] = usePersistentFlag("workflow-nav-collapsed");
  const [navResizing, setNavResizing] = useState(false);
  const rawApi = useApi();
  const [dataVersion, setDataVersion] = useState(0);
  const api = useMemo(() => trackMutations(rawApi, () => setDataVersion((v) => v + 1)), [rawApi]);
  const [trashCount, setTrashCount] = useState(0);
  const nav = useResizableWidth({ storageKey: "workflow-nav-width", initial: 180, min: 140, max: 280 });

  // Der Papierkorb-Zaehler wird nach jeder schreibenden Aktion neu geladen.
  useEffect(() => {
    let cancelled = false;
    api.trashCount().then(
      (count) => {
        if (!cancelled) setTrashCount(count);
      },
      () => {
        // Der Zaehler ist nur eine Anzeige; Fehler zeigt der Papierkorb selbst.
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api, dataVersion]);

  const openNote = useCallback((id: string) => {
    setNoteId(id);
    setView("notizen");
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "n") {
        e.preventDefault();
        setCapturing(true);
      } else if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearching((open) => !open);
      } else if ((e.metaKey || e.ctrlKey) && e.key === ",") {
        e.preventDefault();
        setSettingsOpen(true);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  return (
    <ApiContext.Provider value={api}>
      <OpenNoteContext.Provider value={openNote}>
        <div
          className={`app${navResizing ? " resizing" : ""}${navCollapsed ? " nav-collapsed" : ""}`}
          style={
            {
              gridTemplateColumns: `${navCollapsed ? NAV_RAIL_WIDTH : nav.width}px 1fr`,
              "--nav-width": `${nav.width}px`,
            } as React.CSSProperties
          }
        >
          <div className="navigation-wrap" inert={navCollapsed}>
            <Navigation
              active={view}
              onSelect={setView}
              onCapture={() => setCapturing(true)}
              onSearch={() => setSearching(true)}
              onSettings={() => setSettingsOpen(true)}
              onCollapse={() => setNavCollapsed(true)}
              trashCount={trashCount}
            />
            <ResizeHandle
              edge="right"
              label="Breite der Navigation"
              width={nav.width}
              min={140}
              max={280}
              onChange={nav.setWidth}
              onResizingChange={setNavResizing}
              onReset={nav.reset}
            />
          </div>
          {navCollapsed && (
            <button
              type="button"
              className="icon-button nav-expand"
              aria-label="Navigation ausklappen"
              onClick={() => setNavCollapsed(false)}
            >
              →
            </button>
          )}
          {view === "heute" ? (
            <HeuteView />
          ) : view === "aufgaben" ? (
            <AufgabenView
              key={taskTarget?.nonce ?? 0}
              initialCategoryId={taskTarget?.categoryId}
              highlightTaskId={taskTarget?.taskId}
            />
          ) : view === "notizen" ? (
            <NotizenView noteId={noteId} onSelect={setNoteId} />
          ) : view === "papierkorb" ? (
            <TrashView />
          ) : (
            <Platzhalter title={TITLES.archiv} />
          )}
          {settingsOpen && <SettingsDialog onClose={() => setSettingsOpen(false)} />}
          {capturing && <QuickCapture onClose={() => setCapturing(false)} />}
          {searching && (
            <GlobalSearch
              onClose={() => setSearching(false)}
              onOpenNote={openNote}
              onOpenTask={(hit) => {
                setTaskTarget({ categoryId: hit.categoryId, taskId: hit.id, nonce: Date.now() });
                setView("aufgaben");
              }}
              onOpenDay={(date) =>
                date === toDateString(new Date()) ? setView("heute") : setDayPreview(date)
              }
            />
          )}
          {dayPreview && <DayNoteDialog date={dayPreview} onClose={() => setDayPreview(null)} />}
        </div>
      </OpenNoteContext.Provider>
    </ApiContext.Provider>
  );
}
