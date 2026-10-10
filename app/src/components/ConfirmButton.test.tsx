import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ConfirmButton } from "./ConfirmButton";

describe("ConfirmButton", () => {
  it("führt die Aktion erst nach dem zweiten Klick aus", async () => {
    const user = userEvent.setup();
    const onConfirm = vi.fn();
    render(<ConfirmButton onConfirm={onConfirm}>Endgültig löschen</ConfirmButton>);

    await user.click(screen.getByRole("button", { name: "Endgültig löschen" }));
    expect(onConfirm).not.toHaveBeenCalled();
    await user.click(screen.getByRole("button", { name: "Sicher?" }));
    expect(onConfirm).toHaveBeenCalledTimes(1);
    expect(screen.getByRole("button", { name: "Endgültig löschen" })).toBeInTheDocument();
  });

  it("nimmt die Nachfrage zurück, wenn der Fokus den Knopf verlässt oder Zeit vergeht", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    try {
      const user = userEvent.setup({ advanceTimers: vi.advanceTimersByTime });
      const onConfirm = vi.fn();
      render(
        <>
          <ConfirmButton onConfirm={onConfirm}>Löschen</ConfirmButton>
          <button type="button">Woanders</button>
        </>,
      );
      await user.click(screen.getByRole("button", { name: "Löschen" }));
      await user.click(screen.getByRole("button", { name: "Woanders" }));
      expect(screen.getByRole("button", { name: "Löschen" })).toBeInTheDocument();

      await user.click(screen.getByRole("button", { name: "Löschen" }));
      vi.advanceTimersByTime(4100);
      expect(await screen.findByRole("button", { name: "Löschen" })).toBeInTheDocument();
      expect(onConfirm).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
});
