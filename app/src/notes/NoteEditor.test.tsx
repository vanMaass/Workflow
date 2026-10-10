import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { Editor } from "@tiptap/react";
import { describe, expect, it, vi } from "vitest";
import NoteEditor from "./NoteEditor";

const doc = JSON.stringify({
  type: "doc",
  content: [{ type: "paragraph", content: [{ type: "text", text: "Hallo Welt" }] }],
});

function setup(content = doc) {
  const onChange = vi.fn();
  const onCreateTask = vi.fn();
  let editor: Editor | undefined;
  render(
    <NoteEditor
      content={content}
      onChange={onChange}
      onCreateTask={onCreateTask}
      onEditor={(e) => {
        editor = e;
      }}
    />,
  );
  const getEditor = () => {
    if (!editor) throw new Error("Editor wurde nicht aufgebaut");
    return editor;
  };
  /** Hängt Text an das Dokumentende, als hätte der Nutzer ihn getippt. */
  const append = async (text: string) => {
    await act(async () => {
      getEditor().chain().focus("end").insertContent(text).run();
    });
  };
  const press = (key: string) => fireEvent.keyDown(getEditor().view.dom, { key });
  const lastContent = () => String(onChange.mock.calls.at(-1)?.[0] ?? "");
  return { onChange, onCreateTask, getEditor, append, press, lastContent };
}

const menu = () => screen.queryByRole("listbox", { name: "Blöcke" });

describe("NoteEditor (freie Schreibfläche)", () => {
  it("zeigt den Inhalt ohne Werkzeugleiste", async () => {
    setup();
    expect(await screen.findByText("Hallo Welt")).toBeInTheDocument();
    expect(screen.queryByRole("toolbar")).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Überschrift 1" })).not.toBeInTheDocument();
    expect(menu()).not.toBeInTheDocument();
  });

  it("weist im leeren Dokument auf das /-Menü hin", async () => {
    setup("");
    await screen.findByRole("textbox", { name: "Notizinhalt" });
    expect(document.querySelector("p[data-placeholder]")).toHaveAttribute(
      "data-placeholder",
      "Schreibe los … oder tippe / für Blöcke",
    );
  });

  it("startet mit leerem Dokument, wenn der gespeicherte Inhalt unlesbar ist", async () => {
    setup("{kaputt");
    expect(await screen.findByRole("textbox", { name: "Notizinhalt" })).toBeInTheDocument();
  });

  it("öffnet beim Tippen von / das Blockmenü und schließt es bei Escape", async () => {
    const { append, press } = setup();
    await screen.findByText("Hallo Welt");

    await append(" /");
    expect(await screen.findByRole("listbox", { name: "Blöcke" })).toBeInTheDocument();
    expect(screen.getAllByRole("option")).toHaveLength(9);

    press("Escape");
    await waitFor(() => expect(menu()).not.toBeInTheDocument());
  });

  it("öffnet kein Menü bei einem / mitten im Wort (z. B. in Adressen)", async () => {
    const { append } = setup();
    await screen.findByText("Hallo Welt");
    await append("x/y");
    expect(menu()).not.toBeInTheDocument();
  });

  it("filtert beim Weitertippen und führt den gewählten Block mit Enter aus", async () => {
    const { append, press, lastContent, onChange } = setup();
    await screen.findByText("Hallo Welt");

    await append(" /to");
    expect(await screen.findByRole("option", { name: "To-do-Liste" })).toBeInTheDocument();
    expect(screen.queryByRole("option", { name: "Überschrift 1" })).not.toBeInTheDocument();

    press("Enter");
    await waitFor(() => expect(lastContent()).toContain('"type":"taskList"'));
    expect(onChange.mock.calls.at(-1)?.[1]).toBe("Hallo Welt");
    expect(menu()).not.toBeInTheDocument();
  });

  it("wählt mit den Pfeiltasten und per Klick einen Block", async () => {
    const user = userEvent.setup();
    const { append, press, lastContent } = setup();
    await screen.findByText("Hallo Welt");

    await append(" /");
    const options = await screen.findAllByRole("option");
    expect(options[0]).toHaveAttribute("aria-selected", "true");
    press("ArrowDown");
    await waitFor(() => expect(screen.getAllByRole("option")[1]).toHaveAttribute("aria-selected", "true"));
    press("ArrowUp");
    await waitFor(() => expect(screen.getAllByRole("option")[0]).toHaveAttribute("aria-selected", "true"));

    await user.click(screen.getByRole("option", { name: "Überschrift 2" }));
    await waitFor(() => expect(lastContent()).toContain('"type":"heading"'));
    expect(lastContent()).toContain('"level":2');
  });

  it("legt über das Menü aus der aktuellen Zeile eine Aufgabe an", async () => {
    const user = userEvent.setup();
    const { append, onCreateTask } = setup();
    await screen.findByText("Hallo Welt");

    await append(" /aufgabe");
    await user.click(await screen.findByRole("option", { name: "Als Aufgabe für Heute" }));
    expect(onCreateTask).toHaveBeenCalledWith("Hallo Welt", "Heute");

    await append(" /inbox");
    await user.click(await screen.findByRole("option", { name: "Als Aufgabe in die Inbox" }));
    expect(onCreateTask).toHaveBeenLastCalledWith("Hallo Welt", "Inbox");
  });
});
