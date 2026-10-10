import { useCallback, useEffect, useState } from "react";
import { useApi } from "../api/context";
import { CATEGORY, type Category, type Task } from "../api/types";
import type { ToastState } from "../components/UndoToast";
import { toDateString } from "../lib/date";

/** Laedt Aufgaben und Kategorien und stellt Aenderungen mit Rueckgaengig bereit. */
export function useTasks() {
  const api = useApi();
  const [tasks, setTasks] = useState<Task[] | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<ToastState | null>(null);
  const [reloadCount, setReloadCount] = useState(0);
  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    Promise.all([api.listTasks(), api.listCategories()]).then(
      ([loadedTasks, loadedCategories]) => {
        if (cancelled) return;
        setTasks(loadedTasks);
        setCategories(loadedCategories);
        setError(null);
      },
      (e) => {
        if (!cancelled) setError(`Aufgaben konnten nicht geladen werden: ${String(e)}`);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api, reloadCount]);

  const run = useCallback(
    async <T>(action: () => Promise<T>): Promise<T | null> => {
      try {
        const result = await action();
        reload();
        return result;
      } catch (e) {
        setError(`Aenderung konnte nicht gespeichert werden: ${String(e)}`);
        return null;
      }
    },
    [reload],
  );

  const nameOf = (id: string) => categories.find((c) => c.id === id)?.name ?? id;

  const create = (title: string, categoryId: string) =>
    run(() => api.createTask({ title, categoryId, date: toDateString(new Date()) }));

  const move = (task: Task, categoryId: string) => {
    if (task.categoryId === categoryId) return Promise.resolve(null);
    const today = toDateString(new Date());
    const previous = { categoryId: task.categoryId, plannedDate: task.plannedDate ?? today };
    return run(async () => {
      await api.moveTask(task.id, categoryId, today);
      setToast({
        id: Date.now(),
        message: `„${task.title}“ nach ${nameOf(categoryId)} verschoben`,
        undo: () => void run(() => api.moveTask(task.id, previous.categoryId, previous.plannedDate)),
      });
    });
  };

  // Abhaken erledigt; Abwaehlen holt die Aufgabe dorthin zurueck, wo sie abgehakt wurde.
  const toggleDone = (task: Task) => {
    if (task.categoryId !== CATEGORY.done) return move(task, CATEGORY.done);
    const today = toDateString(new Date());
    return run(async () => {
      const reopened = await api.reopenTask(task.id, today);
      setToast({
        id: Date.now(),
        message: `„${task.title}“ nach ${nameOf(reopened.categoryId)} zurückgeholt`,
        undo: () => void run(() => api.moveTask(task.id, CATEGORY.done, today)),
      });
    });
  };

  const showDeleteToast = (message: string, ids: string[]) =>
    setToast({
      id: Date.now(),
      message,
      undo: () => void run(() => api.restoreTasks(ids)),
    });

  const deleteTask = (task: Task) =>
    run(async () => {
      await api.deleteTask(task.id);
      showDeleteToast(`„${task.title}“ gelöscht`, [task.id]);
    });

  const deleteDoneTasks = () =>
    run(async () => {
      const ids = await api.deleteDoneTasks();
      if (ids.length > 0) showDeleteToast(`${ids.length} erledigte Aufgaben gelöscht`, ids);
    });

  const addCategory = (name: string) => run(() => api.createCategory(name));

  const removeCategory = (category: Category) =>
    run(async () => {
      const movedTaskIds = await api.deleteCategory(category.id);
      setToast({
        id: Date.now(),
        message: `Kategorie „${category.name}“ entfernt – ihre Aufgaben liegen jetzt in der Inbox`,
        undo: () => void run(() => api.restoreCategory(category.id, movedTaskIds)),
      });
    });

  return {
    tasks,
    categories,
    error,
    toast,
    dismissToast: () => setToast(null),
    create,
    move,
    toggleDone,
    deleteTask,
    deleteDoneTasks,
    addCategory,
    removeCategory,
  };
}
