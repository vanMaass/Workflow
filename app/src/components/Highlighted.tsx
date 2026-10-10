import { Fragment } from "react";

const escapeRegExp = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

/** Zeigt `text` und hebt jedes Vorkommen eines Suchbegriffs hervor (ohne Beachtung der Gross-/Kleinschreibung). */
export function Highlighted({ text, query }: { text: string; query: string }) {
  const terms = query.split(/\s+/).filter(Boolean);
  if (terms.length === 0 || !text) return <>{text}</>;
  const pattern = new RegExp(`(${terms.map(escapeRegExp).join("|")})`, "giu");
  // Beim Teilen mit einer Gruppe stehen die Treffer an den ungeraden Positionen.
  return (
    <>
      {text.split(pattern).map((part, index) =>
        index % 2 === 1 ? <mark key={index}>{part}</mark> : <Fragment key={index}>{part}</Fragment>,
      )}
    </>
  );
}
