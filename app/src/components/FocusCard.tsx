import { useState } from "react";
import { AutoSaveText } from "./AutoSaveText";

interface Props {
  initialValue: string;
  onSave: (focus: string) => void;
}

/** Tagesfokus: wird hervorgehoben, sobald ein Fokus eingetragen ist. */
export function FocusCard({ initialValue, onSave }: Props) {
  const [filled, setFilled] = useState(initialValue.trim() !== "");

  return (
    <section className="focus-card" data-filled={filled} aria-labelledby="fokus-label">
      <p className="section-label" id="fokus-label">
        Mein Fokus heute
      </p>
      <AutoSaveText
        label="Was ist heute wichtig?"
        placeholder="Was ist heute wichtig?"
        className="focus-input"
        initialValue={initialValue}
        onTextChange={(text) => setFilled(text.trim() !== "")}
        onSave={onSave}
      />
    </section>
  );
}
