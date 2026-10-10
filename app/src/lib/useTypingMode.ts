import { useEffect } from "react";

const MOVE_THRESHOLD = 3;

const isTypingKey = (e: KeyboardEvent) =>
  (e.key.length === 1 && !e.ctrlKey && !e.metaKey) || e.key === "Backspace" || e.key === "Delete" || e.key === "Enter";

/**
 * Schreibfokus: Beim Tippen in `area` setzt der Hook `data-typing="true"` auf dem Wurzelelement;
 * das Stylesheet blendet daraufhin Menues und Seitenleisten aus. Sobald die Maus bewegt oder
 * geklickt wird, kehren sie zurueck. Kleinste Zitterbewegungen (unter 3 px) zaehlen nicht.
 */
export function useTypingMode(area = ".note-main") {
  useEffect(() => {
    const root = document.documentElement;
    let pointer: { x: number; y: number } | null = null;

    const onKeyDown = (e: KeyboardEvent) => {
      if (!(e.target instanceof Element) || !e.target.closest(area)) return;
      if (isTypingKey(e)) root.dataset.typing = "true";
    };
    const onMouseMove = (e: MouseEvent) => {
      const moved = !pointer || Math.hypot(e.clientX - pointer.x, e.clientY - pointer.y) >= MOVE_THRESHOLD;
      pointer = { x: e.clientX, y: e.clientY };
      if (moved) delete root.dataset.typing;
    };
    const onPointerDown = () => {
      delete root.dataset.typing;
    };

    document.addEventListener("keydown", onKeyDown, true);
    document.addEventListener("mousemove", onMouseMove);
    document.addEventListener("pointerdown", onPointerDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      document.removeEventListener("mousemove", onMouseMove);
      document.removeEventListener("pointerdown", onPointerDown);
      delete root.dataset.typing;
    };
  }, [area]);
}
