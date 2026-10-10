import { useState } from "react";
import { ResizeHandle } from "../components/ResizeHandle";
import { greetingForHour } from "../lib/greeting";
import { usePersistentFlag } from "../lib/usePersistentFlag";
import { useResizableWidth } from "../lib/useResizableWidth";
import { CATEGORY } from "../api/types";
import { FocusCard } from "../components/FocusCard";
import { WorkNotePanel } from "../components/WorkNotePanel";
import { TaskRow } from "../components/TaskRow";
import { formatLongDate } from "../lib/date";
import { useToday } from "./useToday";

const VISIBLE_TASKS = 7;

export function HeuteView() {
  const today = useToday();
  const [newTitle, setNewTitle] = useState("");
  const [showAll, setShowAll] = useState(false);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contextOpen, setContextOpen] = useState(true);
  const [resizing, setResizing] = useState(false);
  const [carryoverCollapsed, setCarryoverCollapsed] = usePersistentFlag("workflow-carryover-collapsed");
  const context = useResizableWidth({
    storageKey: "workflow-kontext-width",
    initial: 340,
    min: 240,
    max: 480,
  });

  const { view } = today;
  const tasks = view
    ? [...view.tasks].sort(
        (a, b) => Number(a.categoryId === CATEGORY.done) - Number(b.categoryId === CATEGORY.done),
      )
    : [];
  const shown = showAll ? tasks : tasks.slice(0, VISIBLE_TASKS);
  const selected = tasks.find((t) => t.id === selectedId) ?? null;

  const add = () => {
    if (!newTitle.trim()) return;
    void today.addToToday(newTitle);
    setNewTitle("");
  };

  return (
    <div className="heute">
      <main className="tagesplan" aria-label="Tagesplan">
        {today.error && (
          <div className="banner" role="alert">
            {today.error}
          </div>
        )}
        <header>
          <p className="date">{formatLongDate(today.date)}</p>
          <h1>{greetingForHour(new Date().getHours())}</h1>
        </header>

        {!view ? (
          !today.error && <p className="hint">Wird geladen ...</p>
        ) : (
          <>
            <FocusCard
              key={view.plan.date}
              initialValue={view.plan.focus}
              onSave={(focus) => void today.savePlan({ focus })}
            />

            {view.carryover.length > 0 && (
              <section aria-labelledby="gestern-titel">
                <h2 id="gestern-titel">
                  <button
                    type="button"
                    className="collapse-heading"
                    aria-expanded={!carryoverCollapsed}
                    onClick={() => setCarryoverCollapsed((v) => !v)}
                  >
                    <span aria-hidden="true">{carryoverCollapsed ? "▸" : "▾"}</span> Offen von gestern{" "}
                    <span className="count">{view.carryover.length}</span>
                  </button>
                </h2>
                <ul className="task-list" hidden={carryoverCollapsed}>
                  {view.carryover.map((task) => (
                    <TaskRow
                      key={task.id}
                      task={task}
                      onToggle={today.toggleDone}
                      actions={
                        <>
                          <button
                            type="button"
                            className="icon-button"
                            title="Nach heute uebernehmen"
                            aria-label={`${task.title} nach heute uebernehmen`}
                            onClick={() => void today.moveToToday(task)}
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            className="text-button"
                            onClick={() => void today.moveToUpcoming(task)}
                          >
                            Demnächst
                          </button>
                        </>
                      }
                    />
                  ))}
                </ul>
              </section>
            )}

            <section aria-labelledby="heute-titel">
              <h2 id="heute-titel">Aufgaben für heute</h2>
              <ul className="task-list">
                {shown.map((task) => (
                  <TaskRow
                    key={task.id}
                    task={task}
                    selected={task.id === selectedId}
                    onToggle={today.toggleDone}
                    onSelect={(t) => {
                      setSelectedId(t.id);
                      setContextOpen(true);
                    }}
                  />
                ))}
              </ul>
              {tasks.length > VISIBLE_TASKS && (
                <button type="button" className="text-button" onClick={() => setShowAll((v) => !v)}>
                  {showAll
                    ? "Weniger anzeigen"
                    : `Weitere Aufgaben anzeigen (${tasks.length - VISIBLE_TASKS})`}
                </button>
              )}
              <input
                type="text"
                className="add-input"
                aria-label="Aufgabe hinzufügen"
                placeholder="+ Aufgabe hinzufügen"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
              />
            </section>
          </>
        )}
      </main>

      <aside
        className={`kontext${contextOpen ? "" : " collapsed"}${resizing ? " resizing" : ""}`}
        style={{ width: contextOpen ? context.width : 0 }}
        aria-label="Kontext"
        aria-hidden={!contextOpen}
      >
        {contextOpen && (
          <ResizeHandle
            edge="left"
            label="Breite der Arbeitsnotiz"
            width={context.width}
            min={240}
            max={480}
            onChange={context.setWidth}
            onResizingChange={setResizing}
            onReset={context.reset}
          />
        )}
        <div className="kontext-inner" style={{ width: context.width }}>
          <button
            type="button"
            className="icon-button collapse-toggle"
            aria-label="Arbeitsnotiz einklappen"
            tabIndex={contextOpen ? 0 : -1}
            onClick={() => setContextOpen(false)}
          >
            →
          </button>
          {selected ? (
            <div className="task-detail">
              <h2>{selected.title}</h2>
              <div className="detail-actions">
                <button type="button" onClick={() => void today.toggleDone(selected)}>
                  {selected.categoryId === CATEGORY.done ? "Wieder öffnen" : "Erledigen"}
                </button>
                <button type="button" onClick={() => void today.moveToTomorrow(selected)}>
                  Auf morgen verschieben
                </button>
                <button
                  type="button"
                  onClick={() => {
                    void today.removeFromToday(selected);
                    setSelectedId(null);
                  }}
                >
                  Aus Tagesplan entfernen
                </button>
                <button type="button" onClick={() => setSelectedId(null)}>
                  Zur Notiz
                </button>
              </div>
            </div>
          ) : (
            view && (
              <WorkNotePanel
                date={view.plan.date}
                quickNote={view.plan.note}
                onSaveQuick={(note) => void today.savePlan({ note })}
                onTasksChanged={today.refresh}
              />
            )
          )}
        </div>
      </aside>

      {!contextOpen && (
        <button
          type="button"
          className="icon-button expand-toggle"
          aria-label="Arbeitsnotiz ausklappen"
          onClick={() => setContextOpen(true)}
        >
          ←
        </button>
      )}
    </div>
  );
}
