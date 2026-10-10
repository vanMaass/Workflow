import type { HTMLAttributes, ReactNode } from "react";
import { CATEGORY, type Task } from "../api/types";
import { useOpenNote } from "../lib/OpenNoteContext";

interface Props {
  task: Task;
  selected?: boolean;
  onToggle: (task: Task) => void;
  onSelect?: (task: Task) => void;
  actions?: ReactNode;
  dragProps?: HTMLAttributes<HTMLLIElement>;
  /** Blendet den Notiz-Hinweis aus (z. B. innerhalb der Notiz selbst). */
  hideNoteLink?: boolean;
}

export function TaskRow({ task, selected, onToggle, onSelect, actions, dragProps, hideNoteLink }: Props) {
  const done = task.categoryId === CATEGORY.done;
  const openNote = useOpenNote();
  const noteId = task.noteId;
  return (
    <li data-task-id={task.id} className={`task-row${selected ? " selected" : ""}${done ? " done" : ""}`} {...dragProps}>
      <input
        type="checkbox"
        className="checkbox"
        checked={done}
        aria-label={`${task.title} erledigen`}
        onChange={() => onToggle(task)}
      />
      {onSelect ? (
        <button type="button" className="task-title" onClick={() => onSelect(task)}>
          {task.title}
        </button>
      ) : (
        <span className="task-title">{task.title}</span>
      )}
      {noteId && !hideNoteLink && (
        <button
          type="button"
          className="note-link"
          aria-label={`Notiz zu ${task.title} öffnen`}
          title="Verknüpfte Notiz öffnen"
          onClick={() => openNote(noteId)}
        >
          Notiz
        </button>
      )}
      {actions && <span className="task-actions">{actions}</span>}
    </li>
  );
}
