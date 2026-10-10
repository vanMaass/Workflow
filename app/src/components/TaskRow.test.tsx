import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { Task } from "../api/types";
import { OpenNoteContext } from "../lib/OpenNoteContext";
import { TaskRow } from "./TaskRow";

const task: Task = {
  id: "t1",
  title: "Folien senden",
  categoryId: "Heute",
  priority: null,
  durationMinutes: null,
  pageId: null,
  noteId: "n1",
  plannedDate: null,
  position: 1,
  version: 1,
  createdAt: 0,
  updatedAt: 0,
  completedAt: null,
  completedFrom: null,
};

describe("TaskRow Notiz-Hinweis", () => {
  it("oeffnet die verknuepfte Notiz per Klick", async () => {
    const open = vi.fn();
    render(
      <OpenNoteContext.Provider value={open}>
        <ul>
          <TaskRow task={task} onToggle={() => {}} />
        </ul>
      </OpenNoteContext.Provider>,
    );
    await userEvent.click(screen.getByRole("button", { name: "Notiz zu Folien senden öffnen" }));
    expect(open).toHaveBeenCalledWith("n1");
  });

  it("zeigt keinen Hinweis ohne Notiz oder wenn er ausgeblendet ist", () => {
    const { rerender } = render(
      <ul>
        <TaskRow task={{ ...task, noteId: null }} onToggle={() => {}} />
      </ul>,
    );
    expect(screen.queryByRole("button", { name: /Notiz zu/ })).not.toBeInTheDocument();
    rerender(
      <ul>
        <TaskRow task={task} onToggle={() => {}} hideNoteLink />
      </ul>,
    );
    expect(screen.queryByRole("button", { name: /Notiz zu/ })).not.toBeInTheDocument();
  });
});
