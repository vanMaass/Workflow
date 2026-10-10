import { useEffect, useRef, useState, type ReactNode } from "react";

interface Props {
  children: ReactNode;
  /** Beschriftung, solange auf die Bestaetigung gewartet wird. */
  confirmLabel?: string;
  onConfirm: () => void;
  className?: string;
  ariaLabel?: string;
}

/** Zwei-Schritt-Knopf fuer nicht umkehrbare Aktionen: erster Klick fragt nach, zweiter fuehrt aus. */
export function ConfirmButton({ children, confirmLabel = "Sicher?", onConfirm, className, ariaLabel }: Props) {
  const [armed, setArmed] = useState(false);
  const timer = useRef<number | undefined>(undefined);

  useEffect(() => () => window.clearTimeout(timer.current), []);

  const click = () => {
    window.clearTimeout(timer.current);
    if (armed) {
      setArmed(false);
      onConfirm();
      return;
    }
    setArmed(true);
    timer.current = window.setTimeout(() => setArmed(false), 4000);
  };

  return (
    <button
      type="button"
      className={`${className ?? ""}${armed ? " armed" : ""}`.trim()}
      aria-label={armed ? `${ariaLabel ?? ""} ${confirmLabel}`.trim() : ariaLabel}
      onClick={click}
      onBlur={() => setArmed(false)}
    >
      {armed ? confirmLabel : children}
    </button>
  );
}
