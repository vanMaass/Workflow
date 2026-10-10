import type { ReactNode } from "react";

interface Option<T extends string> {
  value: T;
  label: string;
  /** Optionaler Inhalt vor dem Label, z. B. ein Farbmuster. */
  adornment?: ReactNode;
  style?: React.CSSProperties;
}

interface Props<T extends string> {
  label: string;
  value: T;
  options: Option<T>[];
  onChange: (value: T) => void;
}

/** Gruppe aus Schaltflaechen, von denen genau eine aktiv ist. */
export function Segmented<T extends string>({ label, value, options, onChange }: Props<T>) {
  return (
    <div role="group" aria-label={label} className="segmented">
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          style={option.style}
          aria-pressed={option.value === value}
          onClick={() => onChange(option.value)}
        >
          {option.adornment}
          {option.label}
        </button>
      ))}
    </div>
  );
}
