import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { ApiContext } from "../api/context";
import { createMemoryApi } from "../api/memory";
import { OpenNoteContext } from "../lib/OpenNoteContext";
import { DayNoteDialog } from "./DayNoteDialog";

async function setup() {
  const api = createMemoryApi();
  await api.updateDailyPlan("2026-10-02", { focus: "Roadtrip planen", note: "Route:\nAlpen" });
  const onClose = vi.fn();
  const openNote = vi.fn();
  render(
    <ApiContext.Provider value={api}>
      <OpenNoteContext.Provider value={openNote}>
        <DayNoteDialog date="2026-10-02" onClose={onClose} />
      </OpenNoteContext.Provider>
    </ApiContext.Provider>,
  );
  return { api, onClose, openNote };
}

describe("DayNoteDialog", () => {
  it("zeigt Datum, Fokus und Text der Schnellnotiz", async () => {
    await setup();
    const dialog = await screen.findByRole("dialog", { name: /Schnellnotiz vom Freitag, 2\. Oktober 2026/ });
    expect(dialog).toHaveTextContent("Roadtrip planen");
    expect(await screen.findByText(/Route:/)).toBeInTheDocument();
  });

  it("sichert sie als eigene Notiz, öffnet diese und schließt", async () => {
    const user = userEvent.setup();
    const { api, onClose, openNote } = await setup();
    await user.click(await screen.findByRole("button", { name: "Als Notiz sichern" }));

    await waitFor(() => expect(openNote).toHaveBeenCalledTimes(1));
    const [note] = await api.listNotes();
    expect(note?.title).toMatch(/^Schnellnotiz /);
    expect((await api.getNote(note?.id ?? "")).plainText).toBe("Roadtrip planen\nRoute:\nAlpen");
    expect(openNote).toHaveBeenCalledWith(note?.id);
    expect(onClose).toHaveBeenCalled();
  });

  it("schließt per Escape und ✕", async () => {
    const user = userEvent.setup();
    const { onClose } = await setup();
    await screen.findByRole("dialog");
    await user.keyboard("{Escape}");
    await user.click(screen.getByRole("button", { name: "Schließen" }));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
