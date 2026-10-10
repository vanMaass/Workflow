import { useEffect, useRef, useState } from "react";

interface Props {
  initialValue: string;
  onSave: (value: string) => void;
  /** Wird bei jeder Eingabe aufgerufen, noch vor dem Speichern. */
  onTextChange?: (value: string) => void;
  multiline?: boolean;
  placeholder?: string;
  label: string;
  className?: string;
}

/** Textfeld, das nach kurzer Eingabepause, beim Verlassen und beim Schliessen speichert. */
export function AutoSaveText({ initialValue, onSave, onTextChange, multiline, placeholder, label, className }: Props) {
  const [text, setText] = useState(initialValue);
  const timer = useRef<number | undefined>(undefined);
  const pending = useRef<string | null>(null);
  const save = useRef(onSave);

  useEffect(() => {
    save.current = onSave;
  });

  const flush = () => {
    window.clearTimeout(timer.current);
    if (pending.current !== null) {
      const value = pending.current;
      pending.current = null;
      save.current(value);
    }
  };

  useEffect(() => flush, []);

  const change = (value: string) => {
    setText(value);
    onTextChange?.(value);
    pending.current = value;
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 600);
  };

  const common = {
    value: text,
    placeholder,
    "aria-label": label,
    className,
    onBlur: flush,
  };

  return multiline ? (
    <textarea {...common} onChange={(e) => change(e.target.value)} />
  ) : (
    <input type="text" {...common} onChange={(e) => change(e.target.value)} />
  );
}
