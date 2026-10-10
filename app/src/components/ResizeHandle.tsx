import { useEffect, useRef, type KeyboardEvent, type MouseEvent, type PointerEvent } from "react";

const KEY_STEP = 16;

interface Props {
  width: number;
  min: number;
  max: number;
  onChange: (width: number) => void;
  /** `right`: Griff rechts vom Bereich (linke Leiste); `left`: Griff links vom Bereich (rechte Leiste). */
  edge: "right" | "left";
  label: string;
  onResizingChange?: (resizing: boolean) => void;
  onReset?: () => void;
}

/** Schmaler Ziehgriff zum Aendern der Breite per Maus oder Pfeiltasten. */
export function ResizeHandle({ width, min, max, onChange, edge, label, onResizingChange, onReset }: Props) {
  const start = useRef<{ x: number; width: number } | null>(null);
  // Ziehen nach rechts macht eine linke Leiste breiter, eine rechte schmaler.
  const direction = edge === "right" ? 1 : -1;

  // Beim Ziehen darf kein Text markiert werden: Der Browser startet die Markierung beim Mausdruck,
  // und waehrend des Ziehens sperrt `data-resizing` das Markieren auf der ganzen Seite.
  const onMouseDown = (e: MouseEvent<HTMLDivElement>) => e.preventDefault();

  const onPointerDown = (e: PointerEvent<HTMLDivElement>) => {
    e.currentTarget.setPointerCapture?.(e.pointerId);
    window.getSelection()?.removeAllRanges();
    document.documentElement.dataset.resizing = "true";
    start.current = { x: e.clientX, width };
    onResizingChange?.(true);
  };

  const onPointerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!start.current) return;
    onChange(start.current.width + (e.clientX - start.current.x) * direction);
  };

  const stop = () => {
    if (!start.current) return;
    start.current = null;
    delete document.documentElement.dataset.resizing;
    onResizingChange?.(false);
  };

  // Wird der Griff mitten im Ziehen entfernt, darf die Sperre nicht haengen bleiben.
  useEffect(
    () => () => {
      if (start.current) delete document.documentElement.dataset.resizing;
    },
    [],
  );

  const onKeyDown = (e: KeyboardEvent<HTMLDivElement>) => {
    const step = e.key === "ArrowRight" ? KEY_STEP : e.key === "ArrowLeft" ? -KEY_STEP : 0;
    if (step === 0) return;
    e.preventDefault();
    onChange(width + step * direction);
  };

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={label}
      aria-valuenow={Math.round(width)}
      aria-valuemin={min}
      aria-valuemax={max}
      tabIndex={0}
      className={`resize-handle ${edge}`}
      onMouseDown={onMouseDown}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={stop}
      onPointerCancel={stop}
      onLostPointerCapture={stop}
      onKeyDown={onKeyDown}
      onDoubleClick={onReset}
    />
  );
}
