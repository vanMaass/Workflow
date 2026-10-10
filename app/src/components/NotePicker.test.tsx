import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import type { NoteSummary } from "../api/types";
import { NotePicker, QUICK_NOTE } from "./NotePicker";

const note = (id: string, title: string, excerpt = "", pinned = false): NoteSummary => ({
  id,
  title,
  excerpt,
  pinned,
  createdAt: 0,
  updatedAt: 0,
});

const notes = [
  note("a", "Quartalsplanung", "Budget klären", true),
  note("b", "Meeting mit Lisa", "Folien senden"),
  note("c", "Ideen", "Newsletter starten"),
];

function setup(value = QUICK_NOTE, list: NoteSummary[] | null = notes) {
  const onSelect = vi.fn();
  render(
    <>
      <NotePicker value={value} notes={list} onSelect={onSelect} />
    </>,
  );
  return { onSelect, trigger: () => screen.getByRole("button", { name: /Arbeitsnotiz wählen/ }) };
}

const options = () => screen.getAllByRole("option").map((o) => o.textContent);

describe("NotePicker", () => {
  it("zeigt die aktuelle Auswahl und ist zunächst geschlossen", () => {
    const { trigger } = setup("b");
    expect(trigger()).toHaveAccessibleName("Arbeitsnotiz wählen: Meeting mit Lisa");
    expect(trigger()).toHaveAttribute("aria-expanded", "false");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("öffnet ein zentriertes Auswahlfenster: Schnellnotiz zuerst, angeheftete mit Stern, Vorschau darunter", async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger());

    const dialog = screen.getByRole("dialog", { name: "Arbeitsnotiz wählen" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    // Das Fenster liegt nicht unter dem Knopf, sondern als eigene Ebene über der Seite.
    expect(dialog.closest(".note-picker")).toBeNull();
    expect(dialog.parentElement).toHaveClass("overlay", "center");
    expect(trigger()).toHaveAttribute("aria-expanded", "true");
    expect(options()).toEqual([
      "Schnellnotiz (heute)",
      "★ QuartalsplanungBudget klären",
      "Meeting mit LisaFolien senden",
      "IdeenNewsletter starten",
    ]);
    expect(screen.getByRole("option", { name: "Schnellnotiz (heute)" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByRole("searchbox", { name: "Notiz suchen" })).toHaveFocus();
  });

  it("wählt per Klick, meldet die Auswahl und schließt das Popup", async () => {
    const user = userEvent.setup();
    const { onSelect, trigger } = setup();
    await user.click(trigger());
    await user.click(screen.getByRole("option", { name: /Ideen/ }));

    expect(onSelect).toHaveBeenCalledWith("c");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger()).toHaveFocus();
  });

  it("filtert nach Titel und Vorschautext", async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger());

    await user.keyboard("lisa");
    expect(options()).toEqual(["Meeting mit LisaFolien senden"]);
    await user.clear(screen.getByRole("searchbox"));
    await user.keyboard("newsletter");
    expect(options()).toEqual(["IdeenNewsletter starten"]);
    await user.clear(screen.getByRole("searchbox"));
    await user.keyboard("schnell");
    expect(options()).toEqual(["Schnellnotiz (heute)"]);
    await user.clear(screen.getByRole("searchbox"));
    await user.keyboard("gibt es nicht");
    expect(screen.queryAllByRole("option")).toHaveLength(0);
    expect(screen.getByText("Keine Treffer.")).toBeInTheDocument();
  });

  it("lässt sich per Tastatur bedienen: Pfeile, Enter, Escape", async () => {
    const user = userEvent.setup();
    const { onSelect, trigger } = setup();
    await user.click(trigger());

    await user.keyboard("{ArrowDown}{ArrowDown}");
    expect(screen.getByRole("option", { name: /Meeting mit Lisa/ })).toHaveClass("active");
    await user.keyboard("{ArrowUp}{ArrowUp}{ArrowUp}");
    expect(screen.getByRole("option", { name: /Ideen/ })).toHaveClass("active");
    await user.keyboard("{Enter}");
    expect(onSelect).toHaveBeenCalledWith("c");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(trigger());
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onSelect).toHaveBeenCalledTimes(1);
  });

  it("schließt bei Klick neben das Fenster oder auf ✕, ohne etwas zu wählen", async () => {
    const user = userEvent.setup();
    const { onSelect, trigger } = setup();

    await user.click(trigger());
    await user.click(screen.getByRole("dialog").parentElement as HTMLElement);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    await user.click(trigger());
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Schließen" }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(onSelect).not.toHaveBeenCalled();
    expect(trigger()).toHaveFocus();
  });

  it("bleibt bei Klick in das Fenster offen und startet jedes Mal mit leerer Suche", async () => {
    const user = userEvent.setup();
    const { trigger } = setup();
    await user.click(trigger());
    await user.keyboard("lisa");
    await user.click(screen.getByRole("dialog"));
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(options()).toHaveLength(1);

    await user.keyboard("{Escape}");
    await user.click(trigger());
    expect(screen.getByRole("searchbox")).toHaveValue("");
    expect(within(screen.getByRole("listbox")).getAllByRole("option")).toHaveLength(4);
  });

  it("zeigt die Schnellnotiz auch, solange die Notizen noch laden", async () => {
    const user = userEvent.setup();
    const { trigger } = setup(QUICK_NOTE, null);
    await user.click(trigger());
    expect(options()).toEqual(["Schnellnotiz (heute)"]);
  });
});
