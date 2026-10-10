import { useCallback, useEffect, useState } from "react";
import { useApi } from "../api/context";
import { CATEGORY, type DailyPlanPatch, type Task, type TodayView } from "../api/types";
import { addDays, toDateString } from "../lib/date";

/** Laedt die Heute-Ansicht und stellt Aktionen bereit, die danach neu laden. */
export function useToday() {
  const api = useApi();
  const [date, setDate] = useState(() => toDateString(new Date()));
  const [view, setView] = useState<TodayView | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [reloadCount, setReloadCount] = useState(0);
  const reload = useCallback(() => setReloadCount((n) => n + 1), []);

  useEffect(() => {
    let cancelled = false;
    api.getToday(date).then(
      (loaded) => {
        if (cancelled) return;
        setView(loaded);
        setError(null);
      },
      (e) => {
        if (!cancelled) setError(`Daten konnten nicht geladen werden: ${String(e)}`);
      },
    );
    return () => {
      cancelled = true;
    };
  }, [api, date, reloadCount]);

  // Datumswechsel (z. B. ueber Mitternacht) beim Zurueckkehren ins Fenster erkennen.
  useEffect(() => {
    const onFocus = () => setDate(toDateString(new Date()));
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, []);

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      try {
        await action();
        reload();
      } catch (e) {
        setError(`Aenderung konnte nicht gespeichert werden: ${String(e)}`);
      }
    },
    [reload],
  );

  const moveTo = (task: Task, categoryId: string, plannedFor = date) =>
    run(() => api.moveTask(task.id, categoryId, plannedFor));

  return {
    date,
    refresh: reload,
    view,
    error,
    toggleDone: (task: Task) =>
      task.categoryId === CATEGORY.done ? run(() => api.reopenTask(task.id, date)) : moveTo(task, CATEGORY.done),
    addToToday: (title: string) => run(() => api.createTask({ title, categoryId: CATEGORY.today, date })),
    moveToToday: (task: Task) => moveTo(task, CATEGORY.today),
    moveToTomorrow: (task: Task) => moveTo(task, CATEGORY.today, addDays(date, 1)),
    moveToUpcoming: (task: Task) => moveTo(task, CATEGORY.upcoming),
    removeFromToday: (task: Task) => moveTo(task, CATEGORY.inbox),
    savePlan: async (patch: DailyPlanPatch) => {
      try {
        const plan = await api.updateDailyPlan(date, patch);
        // Die Anzeige uebernimmt den gespeicherten Stand, damit ein spaeter neu aufgebautes Feld nicht veraltet ist.
        setView((current) => (current ? { ...current, plan } : current));
      } catch (e) {
        setError(`Aenderung konnte nicht gespeichert werden: ${String(e)}`);
      }
    },
  };
}
