import { useEffect } from "react";

export interface ToastState {
  id: number;
  message: string;
  undo: () => void;
}

interface Props {
  toast: ToastState;
  onDismiss: () => void;
}

/** Kurzer Hinweis mit "Rückgängig"; verschwindet nach einigen Sekunden. */
export function UndoToast({ toast, onDismiss }: Props) {
  useEffect(() => {
    const timer = window.setTimeout(onDismiss, 6000);
    return () => window.clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <div className="toast" role="status">
      <span>{toast.message}</span>
      <button
        type="button"
        onClick={() => {
          toast.undo();
          onDismiss();
        }}
      >
        Rückgängig
      </button>
    </div>
  );
}
