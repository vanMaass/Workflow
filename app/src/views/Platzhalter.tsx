export function Platzhalter({ title }: { title: string }) {
  return (
    <main className="platzhalter">
      <h1>{title}</h1>
      <p className="hint">Diese Ansicht folgt in einem der nächsten Schritte.</p>
    </main>
  );
}
