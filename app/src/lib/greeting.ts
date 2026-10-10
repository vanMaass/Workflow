/** Begruessung passend zur Tageszeit (lokale Stunde 0-23). */
export function greetingForHour(hour: number): string {
  if (hour < 5) return "Gute Nacht.";
  if (hour < 11) return "Guten Morgen.";
  if (hour < 17) return "Guten Tag.";
  return "Guten Abend.";
}
