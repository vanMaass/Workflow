import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useClipped } from "./useClipped";

function Probe() {
  const { ref, clipped } = useClipped<HTMLDivElement>();
  return (
    <div ref={ref} data-testid="box">
      {clipped ? "abgeschnitten" : "passt"}
    </div>
  );
}

describe("useClipped", () => {
  let trigger: () => void = () => {};
  const originals = {
    scrollHeight: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "scrollHeight"),
    clientHeight: Object.getOwnPropertyDescriptor(HTMLElement.prototype, "clientHeight"),
  };

  beforeEach(() => {
    vi.stubGlobal(
      "ResizeObserver",
      class {
        constructor(callback: () => void) {
          trigger = callback;
        }
        observe() {}
        disconnect() {}
      },
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    for (const [name, descriptor] of Object.entries(originals)) {
      if (descriptor) Object.defineProperty(HTMLElement.prototype, name, descriptor);
    }
  });

  const setSize = (scroll: number, client: number) => {
    Object.defineProperty(HTMLElement.prototype, "scrollHeight", { configurable: true, get: () => scroll });
    Object.defineProperty(HTMLElement.prototype, "clientHeight", { configurable: true, get: () => client });
  };

  it("meldet abgeschnittenen Inhalt und wieder passenden Inhalt", async () => {
    setSize(100, 100);
    render(<Probe />);
    expect(screen.getByTestId("box")).toHaveTextContent("passt");

    setSize(300, 100);
    await act(async () => trigger());
    expect(screen.getByTestId("box")).toHaveTextContent("abgeschnitten");

    setSize(100, 100);
    await act(async () => trigger());
    expect(screen.getByTestId("box")).toHaveTextContent("passt");
  });

  it("stuerzt ohne ResizeObserver nicht ab", () => {
    vi.stubGlobal("ResizeObserver", undefined);
    render(<Probe />);
    expect(screen.getByTestId("box")).toHaveTextContent("passt");
  });
});
