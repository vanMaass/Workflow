import type { Accent, FontChoice } from "../api/types";

export const ACCENTS: Record<Accent, { label: string; light: string; dark: string }> = {
  grau: { label: "Grau", light: "#2f2f2d", dark: "#e6e6e3" },
  gruen: { label: "Grün", light: "#1f6b4f", dark: "#5bbf97" },
  blau: { label: "Blau", light: "#2b6cb0", dark: "#6ea8e8" },
  violett: { label: "Violett", light: "#6b46c1", dark: "#a78bdb" },
  rot: { label: "Rot", light: "#b4322f", dark: "#e5706d" },
};

export const FONTS: Record<FontChoice, { label: string; stack: string }> = {
  system: { label: "System", stack: '-apple-system, "Segoe UI", system-ui, sans-serif' },
  serif: { label: "Serif", stack: 'Georgia, "Times New Roman", serif' },
  mono: { label: "Mono", stack: 'ui-monospace, "SF Mono", Menlo, Consolas, monospace' },
};
