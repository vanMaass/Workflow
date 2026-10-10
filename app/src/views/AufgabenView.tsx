import { useEffect, useState, type DragEvent } from "react";
import { CATEGORY, type Category, type Task } from "../api/types";
import { TaskRow } from "../components/TaskRow";
import { UndoToast } from "../components/UndoToast";
import { useSettings } from "../settings/SettingsContext";
import { useTasks } from "./useTasks";

const EMPTY_TEXT: Record<string, string> = {
  [CATEGORY.inbox]: "Alles eingeordnet. Neue Gedanken landen hier.",
  [CATEGORY.today]: "Noch nichts für heute. Zieh Aufgaben auf „Heute“.",
  [CATEGORY.upcoming]: "Nichts für später vorgemerkt.",
  [CATEGORY.done]: "Noch nichts erledigt.",
};

interface Props {
  /** Kategorie, die beim Oeffnen gewaehlt ist (z. B. aus der Suche). */
  initialCategoryId?: string | null;
  /** Aufgabe, die hervorgehoben und ins Bild gerueckt wird. */
  highlightTaskId?: string | null;
}

export function AufgabenView({ initialCategoryId, highlightTaskId }: Props = {}) {
  const {
    tasks,
    categories,
    error,
    toast,
    dismissToast,
    create,
    move,
    toggleDone,
    deleteTask,
    deleteDoneTasks,
    addCategory,
    removeCategory,
  } = useTasks();
  const { settings } = useSettings();
  const advanced = settings.mode === "advanced";

  const [activeId, setActiveId] = useState<string>(initialCategoryId ?? CATEGORY.inbox);
  const [draft, setDraft] = useState("");
  const [newCategory, setNewCategory] = useState<string | null>(null);
  const [dragging, setDragging] = useState<Task | null>(null);
  const [dragOver, setDragOver] = useState<string | null>(null);
  const [menuFor, setMenuFor] = useState<string | null>(null);

  useEffect(() => {
    if (menuFor === null) return;
    const close = () => setMenuFor(null);
    document.addEventListener("click", close);
    return () => document.removeEventListener("click", close);
  }, [menuFor]);

  // Eine gefundene Aufgabe wird ins Bild gerueckt, sobald die Liste geladen ist.
  useEffect(() => {
    if (!highlightTaskId || !tasks) return;
    document.querySelector(`[data-task-id="${highlightTaskId}"]`)?.scrollIntoView?.({ block: "center" });
  }, [highlightTaskId, tasks]);

  // Easy Mode blendet eigene Kategorien aus, ohne Daten zu veraendern: ihre Aufgaben erscheinen in der Inbox.
  const visible = categories.filter((c) => c.isSystem || advanced);
  const effectiveId = (task: Task) =>
    visible.some((c) => c.id === task.categoryId) ? task.categoryId : CATEGORY.inbox;
  const active = visible.find((c) => c.id === activeId) ?? visible[0];
  const items = tasks && active ? tasks.filter((t) => effectiveId(t) === active.id) : [];

  const submitTask = () => {
    if (!active || !draft.trim()) return;
    void create(draft, active.id);
    setDraft("");
  };

  const submitCategory = async (name: string) => {
    setNewCategory(null);
    if (!name.trim()) return;
    const created = await addCategory(name);
    if (created) setActiveId(created.id);
  };

  const remove = async (category: Category) => {
    if (activeId === category.id) setActiveId(CATEGORY.inbox);
    await removeCategory(category);
  };

  const dragProps = (task: Task) => ({
    draggable: true,
    onDragStart: (e: DragEvent) => {
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", task.id);
      setDragging(task);
    },
    onDragEnd: () => {
      setDragging(null);
      setDragOver(null);
    },
  });

  return (
    <div className="aufgaben-layout">
      <aside className="cats" aria-label="Kategorien">
        <h2>Aufgaben</h2>
        {visible.map((category, index) => {
          const count = tasks ? tasks.filter((t) => effectiveId(t) === category.id).length : 0;
          return (
            <div key={category.id} className="tile-wrap">
              {index === 4 && <div className="divider" />}
              <button
                type="button"
                className={`tile${category.id === active?.id ? " active" : ""}${dragOver === category.id ? " drop" : ""}`}
                aria-current={category.id === active?.id ? "true" : undefined}
                onClick={() => setActiveId(category.id)}
                onDragOver={(e) => {
                  if (!dragging) return;
                  e.preventDefault();
                  setDragOver(category.id);
                }}
                onDragLeave={() => setDragOver(null)}
                onDrop={(e) => {
                  e.preventDefault();
                  if (dragging) void move(dragging, category.id);
                  setDragging(null);
                  setDragOver(null);
                }}
              >
                <span className="tile-label">{category.name}</span>{" "}
                <span className="tile-count">{count}</span>
              </button>
              {!category.isSystem && (
                <button
                  type="button"
                  className="tile-remove"
                  aria-label={`Kategorie ${category.name} entfernen`}
                  title="Kategorie entfernen (Aufgaben wandern in die Inbox)"
                  onClick={() => void remove(category)}
                >
                  ✕
                </button>
              )}
            </div>
          );
        })}

        {advanced &&
          (newCategory === null ? (
            <button type="button" className="add-category" onClick={() => setNewCategory("")}>
              + Kategorie hinzufügen
            </button>
          ) : (
            <input
              autoFocus
              type="text"
              className="category-input"
              aria-label="Name der neuen Kategorie"
              placeholder="Name der Kategorie"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onBlur={() => setNewCategory(null)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void submitCategory(newCategory);
                if (e.key === "Escape") setNewCategory(null);
              }}
            />
          ))}

        <p className="hint">Aufgaben auf ein Feld ziehen, um sie zu verschieben.</p>
      </aside>

      <main className="todos" aria-label="Aufgabenliste">
        {error && (
          <div className="banner" role="alert">
            {error}
          </div>
        )}
        {!tasks || !active ? (
          !error && <p className="hint">Wird geladen ...</p>
        ) : (
          <>
            <header>
              <h1>{active.name}</h1>
              <span className="hint">{items.length === 1 ? "1 Aufgabe" : `${items.length} Aufgaben`}</span>
              {active.id === CATEGORY.done && items.length > 0 && (
                <button
                  type="button"
                  className="text-button clear-done"
                  onClick={() => void deleteDoneTasks()}
                >
                  Alle löschen
                </button>
              )}
            </header>
            <ul className="task-list">
              {items.map((task) => (
                <TaskRow
                  key={task.id}
                  task={task}
                  selected={task.id === highlightTaskId}
                  onToggle={toggleDone}
                  dragProps={dragProps(task)}
                  actions={
                    <>
                      {task.categoryId === CATEGORY.done && (
                        <button
                          type="button"
                          className="icon-button delete-task"
                          aria-label={`${task.title} löschen`}
                          title="Löschen"
                          onClick={() => void deleteTask(task)}
                        >
                          ✕
                        </button>
                      )}
                      <span className="move-menu">
                        <button
                          type="button"
                          className="icon-button"
                          aria-label={`${task.title} verschieben`}
                          aria-haspopup="menu"
                          aria-expanded={menuFor === task.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            setMenuFor(menuFor === task.id ? null : task.id);
                          }}
                        >
                          ⋯
                        </button>
                        {menuFor === task.id && (
                          <div className="menu" role="menu">
                            <p>Verschieben nach</p>
                            {visible
                              .filter((c) => c.id !== effectiveId(task))
                              .map((c) => (
                                <button
                                  key={c.id}
                                  type="button"
                                  role="menuitem"
                                  onClick={() => {
                                    setMenuFor(null);
                                    void move(task, c.id);
                                  }}
                                >
                                  {c.name}
                                </button>
                              ))}
                          </div>
                        )}
                      </span>
                    </>
                  }
                />
              ))}
            </ul>
            {items.length === 0 && (
              <p className="empty">{EMPTY_TEXT[active.id] ?? "Noch keine Aufgaben in dieser Kategorie."}</p>
            )}
            {active.id !== CATEGORY.done && (
              <input
                type="text"
                className="add-input"
                aria-label="Aufgabe hinzufügen"
                placeholder={
                  active.id === CATEGORY.today ? "+ Aufgabe für heute hinzufügen" : "+ Aufgabe hinzufügen"
                }
                value={draft}
                onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && submitTask()}
              />
            )}
          </>
        )}
      </main>
      {toast && <UndoToast toast={toast} onDismiss={dismissToast} />}
    </div>
  );
}
