import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import { TaskItem, TaskList } from "@tiptap/extension-list";
import { Placeholder } from "@tiptap/extensions";
import { useEffect, useRef, useState } from "react";

export type TaskTarget = "Heute" | "Inbox";

interface Props {
  /** Blockbasiertes Dokument als JSON-Text; leer fuer eine neue Notiz. */
  content: string;
  onChange: (content: string, plainText: string) => void;
  /** Legt aus dem Text der aktuellen Zeile eine verknuepfte Aufgabe an. */
  onCreateTask: (text: string, target: TaskTarget) => void;
  /** Gibt den Editor nach dem Aufbau heraus (fuer Tests und Automatisierung). */
  onEditor?: (editor: Editor) => void;
}

interface SlashItem {
  id: string;
  label: string;
  keywords: string[];
  run: (editor: Editor, createTask: Props["onCreateTask"]) => void;
}

const lineText = (editor: Editor) => editor.state.selection.$from.parent.textContent.trim();

/**
 * Bausteine des `/`-Menues. Formatierungen ohne Werkzeugleiste:
 * Markdown-Kuerzel (`# `, `- `, `1. `, `[ ] `), Tastenkuerzel (Fett, Kursiv, Unterstrichen, Hervorheben)
 * und dieses Menue.
 */
const SLASH_ITEMS: SlashItem[] = [
  {
    id: "text",
    label: "Text",
    keywords: ["text", "absatz", "paragraph"],
    run: (e) => void e.chain().focus().setParagraph().run(),
  },
  {
    id: "h1",
    label: "Überschrift 1",
    keywords: ["h1", "ueberschrift", "überschrift", "heading", "titel"],
    run: (e) => void e.chain().focus().setHeading({ level: 1 }).run(),
  },
  {
    id: "h2",
    label: "Überschrift 2",
    keywords: ["h2", "ueberschrift", "überschrift", "heading"],
    run: (e) => void e.chain().focus().setHeading({ level: 2 }).run(),
  },
  {
    id: "bullet",
    label: "Aufzählung",
    keywords: ["liste", "aufzaehlung", "aufzählung", "bullet"],
    run: (e) => void e.chain().focus().toggleBulletList().run(),
  },
  {
    id: "ordered",
    label: "Nummerierte Liste",
    keywords: ["liste", "nummeriert", "nummerierung", "ordered"],
    run: (e) => void e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: "todo",
    label: "To-do-Liste",
    keywords: ["todo", "to-do", "aufgabe", "checkliste", "checkbox"],
    run: (e) => void e.chain().focus().toggleTaskList().run(),
  },
  {
    id: "divider",
    label: "Trennlinie",
    keywords: ["linie", "trenner", "divider", "hr"],
    run: (e) => void e.chain().focus().setHorizontalRule().run(),
  },
  {
    id: "task-today",
    label: "Als Aufgabe für Heute",
    keywords: ["aufgabe", "task", "heute", "verknuepfen"],
    run: (e, create) => {
      const text = lineText(e);
      if (text) create(text, "Heute");
    },
  },
  {
    id: "task-inbox",
    label: "Als Aufgabe in die Inbox",
    keywords: ["aufgabe", "task", "inbox", "verknuepfen"],
    run: (e, create) => {
      const text = lineText(e);
      if (text) create(text, "Inbox");
    },
  },
];

interface SlashState {
  /** Bereich von `/` bis zum Cursor, der beim Ausfuehren entfernt wird. */
  from: number;
  to: number;
  query: string;
  top: number;
  left: number;
}

function parseContent(content: string) {
  if (!content) return "";
  try {
    return JSON.parse(content);
  } catch {
    return "";
  }
}

function matchingItems(query: string): SlashItem[] {
  const q = query.toLowerCase();
  return SLASH_ITEMS.filter(
    (item) => !q || item.label.toLowerCase().includes(q) || item.keywords.some((k) => k.includes(q)),
  );
}

/** Findet ein `/wort` direkt vor dem Cursor (am Zeilenanfang oder nach einem Leerzeichen). */
function detectSlash(editor: Editor): SlashState | null {
  const { selection } = editor.state;
  if (!selection.empty) return null;
  const { $from } = selection;
  if (!$from.parent.isTextblock) return null;
  const before = $from.parent.textBetween(0, $from.parentOffset, undefined, " ");
  const match = /(^|\s)\/([^\s/]*)$/.exec(before);
  if (!match) return null;
  const query = match[2] ?? "";
  let top = 0;
  let left = 0;
  try {
    const coords = editor.view.coordsAtPos(selection.from);
    top = coords.bottom;
    left = coords.left;
  } catch {
    // Ohne Layout (z. B. in Tests) bleibt das Menue an der Ursprungsposition.
  }
  return { from: selection.from - query.length - 1, to: selection.from, query, top, left };
}

export default function NoteEditor({ content, onChange, onCreateTask, onEditor }: Props) {
  const [slash, setSlash] = useState<SlashState | null>(null);
  const [active, setActive] = useState(0);

  // Der Editor und seine Tastenbehandlung entstehen nur einmal; sie lesen den aktuellen Stand ueber Refs.
  const editorRef = useRef<Editor | null>(null);
  const slashRef = useRef<SlashState | null>(null);
  const activeRef = useRef(0);
  const dismissedFrom = useRef<number | null>(null);
  const onChangeRef = useRef(onChange);
  const onCreateTaskRef = useRef(onCreateTask);

  useEffect(() => {
    onChangeRef.current = onChange;
    onCreateTaskRef.current = onCreateTask;
  });

  const setActiveIndex = (index: number) => {
    activeRef.current = index;
    setActive(index);
  };

  const runItem = (item: SlashItem) => {
    const editor = editorRef.current;
    const state = slashRef.current;
    if (!editor || !state) return;
    editor.chain().focus().deleteRange({ from: state.from, to: state.to }).run();
    item.run(editor, (text, target) => onCreateTaskRef.current(text, target));
    slashRef.current = null;
    setSlash(null);
  };

  const refreshSlash = (editor: Editor) => {
    let next = detectSlash(editor);
    if (next && dismissedFrom.current === next.from) next = null;
    if (!next) dismissedFrom.current = null;
    if (next && matchingItems(next.query).length === 0) next = null;
    if (next?.query !== slashRef.current?.query) setActiveIndex(0);
    slashRef.current = next;
    setSlash(next);
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2] }, link: { openOnClick: false } }),
      Highlight,
      TaskList,
      TaskItem.configure({ nested: false }),
      Placeholder.configure({ placeholder: "Schreibe los … oder tippe / für Blöcke" }),
    ],
    content: parseContent(content),
    editorProps: {
      attributes: { "aria-label": "Notizinhalt", role: "textbox", "aria-multiline": "true" },
      handleKeyDown: (_view, event) => {
        const state = slashRef.current;
        if (!state) return false;
        const items = matchingItems(state.query);
        if (items.length === 0) return false;
        if (event.key === "ArrowDown" || event.key === "ArrowUp") {
          const step = event.key === "ArrowDown" ? 1 : items.length - 1;
          setActiveIndex((activeRef.current + step) % items.length);
          return true;
        }
        if (event.key === "Enter" || event.key === "Tab") {
          const item = items[Math.min(activeRef.current, items.length - 1)];
          if (item) runItem(item);
          return true;
        }
        if (event.key === "Escape") {
          dismissedFrom.current = state.from;
          slashRef.current = null;
          setSlash(null);
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: e }) =>
      onChangeRef.current(JSON.stringify(e.getJSON()), e.getText({ blockSeparator: "\n" }).trim()),
    onTransaction: ({ editor: e }) => refreshSlash(e),
  });

  useEffect(() => {
    editorRef.current = editor;
    if (editor) onEditor?.(editor);
  }, [editor, onEditor]);

  if (!editor) return null;

  const items = slash ? matchingItems(slash.query) : [];
  return (
    <div className="note-editor">
      <EditorContent editor={editor} className="note-content" />
      {slash && items.length > 0 && (
        <div
          className="menu slash-menu"
          role="listbox"
          aria-label="Blöcke"
          style={{ top: slash.top + 6, left: slash.left }}
        >
          {items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              role="option"
              aria-selected={index === active}
              className={index === active ? "active" : undefined}
              // Der Editor behaelt beim Klick den Fokus und die Cursorposition.
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => runItem(item)}
            >
              {item.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
