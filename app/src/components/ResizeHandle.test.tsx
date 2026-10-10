import { fireEvent, render, screen } from "@testing-library/react";
import { afterEach } from "vitest";
import { useState } from "react";
import { describe, expect, it } from "vitest";
import { ResizeHandle } from "./ResizeHandle";
import { clamp } from "../lib/useResizableWidth";

function Harness({ edge }: { edge: "left" | "right" }) {
  const [width, setWidth] = useState(200);
  return (
    <ResizeHandle
      edge={edge}
      label="Breite"
      width={width}
      min={150}
      max={260}
      onChange={(w) => setWidth(clamp(w, 150, 260))}
    />
  );
}

const handle = () => screen.getByRole("separator", { name: "Breite" });

describe("ResizeHandle", () => {
  it("aendert die Breite per Pfeiltasten und haelt Mindest- und Maximalbreite ein", () => {
    render(<Harness edge="right" />);
    fireEvent.keyDown(handle(), { key: "ArrowRight" });
    expect(handle()).toHaveAttribute("aria-valuenow", "216");
    for (let i = 0; i < 20; i++) fireEvent.keyDown(handle(), { key: "ArrowRight" });
    expect(handle()).toHaveAttribute("aria-valuenow", "260");
    for (let i = 0; i < 40; i++) fireEvent.keyDown(handle(), { key: "ArrowLeft" });
    expect(handle()).toHaveAttribute("aria-valuenow", "150");
  });

  it("folgt der Maus, bei linkem Griff mit umgekehrter Richtung", () => {
    render(<Harness edge="left" />);
    fireEvent.pointerDown(handle(), { clientX: 500, pointerId: 1 });
    fireEvent.pointerMove(handle(), { clientX: 470, pointerId: 1 });
    expect(handle()).toHaveAttribute("aria-valuenow", "230");
    fireEvent.pointerMove(handle(), { clientX: 100, pointerId: 1 });
    expect(handle()).toHaveAttribute("aria-valuenow", "260");
    fireEvent.pointerUp(handle(), { pointerId: 1 });
    fireEvent.pointerMove(handle(), { clientX: 900, pointerId: 1 });
    expect(handle()).toHaveAttribute("aria-valuenow", "260");
  });
});

describe("ResizeHandle ohne Textmarkierung", () => {
  const resizing = () => document.documentElement.dataset.resizing;

  afterEach(() => {
    delete document.documentElement.dataset.resizing;
  });

  it("verhindert die Standardaktion des Mausdrucks, damit kein Text markiert wird", () => {
    render(<Harness edge="right" />);
    // dispatchEvent liefert false, wenn die Standardaktion abgebrochen wurde.
    expect(fireEvent.mouseDown(handle())).toBe(false);
  });

  it("sperrt die Markierung auf der ganzen Seite, solange gezogen wird", () => {
    render(<Harness edge="right" />);
    expect(resizing()).toBeUndefined();
    fireEvent.pointerDown(handle(), { clientX: 100, pointerId: 1 });
    expect(resizing()).toBe("true");
    fireEvent.pointerMove(handle(), { clientX: 120, pointerId: 1 });
    expect(resizing()).toBe("true");
    fireEvent.pointerUp(handle(), { pointerId: 1 });
    expect(resizing()).toBeUndefined();
  });

  it("hebt die Sperre auch bei Abbruch, verlorenem Zeiger und Entfernen des Griffs auf", () => {
    const { unmount } = render(<Harness edge="left" />);
    fireEvent.pointerDown(handle(), { clientX: 100, pointerId: 1 });
    fireEvent.pointerCancel(handle(), { pointerId: 1 });
    expect(resizing()).toBeUndefined();

    fireEvent.pointerDown(handle(), { clientX: 100, pointerId: 1 });
    fireEvent.lostPointerCapture(handle(), { pointerId: 1 });
    expect(resizing()).toBeUndefined();

    fireEvent.pointerDown(handle(), { clientX: 100, pointerId: 1 });
    expect(resizing()).toBe("true");
    unmount();
    expect(resizing()).toBeUndefined();
  });

  it("löscht eine bestehende Textmarkierung beim Start des Ziehens", () => {
    render(
      <>
        <p>Markierter Text</p>
        <Harness edge="right" />
      </>,
    );
    const range = document.createRange();
    range.selectNodeContents(screen.getByText("Markierter Text"));
    window.getSelection()?.addRange(range);
    expect(window.getSelection()?.toString()).toBe("Markierter Text");

    fireEvent.pointerDown(handle(), { clientX: 100, pointerId: 1 });
    expect(window.getSelection()?.toString()).toBe("");
  });
});
