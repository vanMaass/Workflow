import { createContext, useContext } from "react";

/** Oeffnet eine Notiz in der Notizen-Ansicht; wird von der App bereitgestellt. */
export const OpenNoteContext = createContext<(noteId: string) => void>(() => {});

export function useOpenNote() {
  return useContext(OpenNoteContext);
}
