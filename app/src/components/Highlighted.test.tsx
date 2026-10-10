import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Highlighted } from "./Highlighted";

const marks = (query: string, text: string) => {
  const { container } = render(<Highlighted text={text} query={query} />);
  return [...container.querySelectorAll("mark")].map((m) => m.textContent);
};

describe("Highlighted", () => {
  it("hebt alle Vorkommen jedes Begriffs hervor, ohne Groß-/Kleinschreibung", () => {
    expect(marks("lisa budget", "Budget mit LISA und Lisa klären")).toEqual(["Budget", "LISA", "Lisa"]);
  });

  it("funktioniert mit Umlauten", () => {
    expect(marks("äpfel", "Brot, ÄPFEL und äpfel")).toEqual(["ÄPFEL", "äpfel"]);
  });

  it("behandelt Sonderzeichen der Suche als normalen Text", () => {
    expect(marks("a.b (c", "a.b (c) axb")).toEqual(["a.b", "(c"]);
    expect(marks("[x", "Liste [x] fertig")).toEqual(["[x"]);
  });

  it("zeigt den Text unverändert ohne Suchbegriff oder Text", () => {
    expect(marks("", "Nichts hervorgehoben")).toEqual([]);
    expect(marks("   ", "Nichts hervorgehoben")).toEqual([]);
    expect(marks("x", "")).toEqual([]);
  });
});
