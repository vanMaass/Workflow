import { invoke } from "@tauri-apps/api/core";
import type { Api } from "./types";

export const tauriApi: Api = {
  search: (query, options) => invoke("search", { query, scope: options?.scope, kinds: options?.kinds }),
  listTrash: () => invoke("list_trash"),
  trashCount: () => invoke("trash_count"),
  purgeTasks: (ids) => invoke("purge_tasks", { ids }),
  purgeNotes: (ids) => invoke("purge_notes", { ids }),
  emptyTrash: () => invoke("empty_trash"),
  listNotes: (query) => invoke("list_notes", { query }),
  getNote: (id) => invoke("get_note", { id }),
  createNote: (title) => invoke("create_note", { title }),
  updateNote: (id, patch) => invoke("update_note", { id, patch }),
  deleteNote: (id) => invoke("delete_note", { id }),
  restoreNote: (id) => invoke("restore_note", { id }),
  createTaskFromNote: ({ noteId, title, categoryId, date }) =>
    invoke("create_task_from_note", { noteId, title, categoryId, date }),
  getSettings: () => invoke("get_settings"),
  updateSettings: (patch) => invoke("update_settings", { patch }),
  listTasks: () => invoke("list_tasks"),
  getToday: (date) => invoke("get_today", { date }),
  createTask: ({ title, categoryId, date }) => invoke("create_task", { title, categoryId, date }),
  moveTask: (id, categoryId, date) => invoke("move_task", { id, categoryId, date }),
  reopenTask: (id, date) => invoke("reopen_task", { id, date }),
  deleteTask: (id) => invoke("delete_task", { id }),
  deleteDoneTasks: () => invoke("delete_done_tasks"),
  restoreTasks: (ids) => invoke("restore_tasks", { ids }),
  listCategories: () => invoke("list_categories"),
  createCategory: (name) => invoke("create_category", { name }),
  deleteCategory: (id) => invoke("delete_category", { id }),
  restoreCategory: (id, taskIds) => invoke("restore_category", { id, taskIds }),
  updateDailyPlan: (date, patch) =>
    invoke("update_daily_plan", { date, focus: patch.focus, note: patch.note }),
};
