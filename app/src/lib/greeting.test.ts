import { describe, expect, it } from "vitest";
import { greetingForHour } from "./greeting";

describe("greetingForHour", () => {
  it.each([
    [2, "Gute Nacht."],
    [8, "Guten Morgen."],
    [13, "Guten Tag."],
    [20, "Guten Abend."],
  ])("Stunde %i -> %s", (hour, expected) => {
    expect(greetingForHour(hour)).toBe(expected);
  });
});
