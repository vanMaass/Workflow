import { useEffect, useRef, useState } from "react";

/**
 * Meldet, ob der Inhalt eines nicht scrollbaren Bereichs abgeschnitten ist. Reagiert auf
 * Groessenaenderungen des Bereichs und auf geaenderte Inhalte.
 */
export function useClipped<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [clipped, setClipped] = useState(false);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const check = () => setClipped(element.scrollHeight > element.clientHeight + 1);
    const resizeObserver = new ResizeObserver(check);
    resizeObserver.observe(element);
    const mutationObserver = new MutationObserver(check);
    mutationObserver.observe(element, { childList: true, subtree: true });
    return () => {
      resizeObserver.disconnect();
      mutationObserver.disconnect();
    };
  }, []);

  return { ref, clipped };
}
