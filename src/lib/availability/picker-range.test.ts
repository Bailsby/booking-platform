import { describe, expect, it } from "vitest";
import { pageStartFor, pickerRange } from "./picker-range";

// 60 days: 25 September to 23 November.
const window = { first: "2026-09-25", last: "2026-11-23" };

describe("pickerRange", () => {
  it("starts at the beginning of the window by default", () => {
    expect(pickerRange(window, undefined)).toEqual({
      start: "2026-09-25",
      earlier: null,
      later: "2026-10-09",
    });
  });

  it("pages forwards and back a fortnight at a time", () => {
    expect(pickerRange(window, "2026-10-09")).toEqual({
      start: "2026-10-09",
      earlier: "2026-09-25",
      later: "2026-10-23",
    });
  });

  it("never pages back past the start of the window", () => {
    expect(pickerRange(window, "2026-10-01").earlier).toBe("2026-09-25");
  });

  it("stops offering later dates past the end of the window", () => {
    expect(pickerRange(window, "2026-11-20").later).toBeNull();
  });

  it("finds the page a date sits on", () => {
    expect(pageStartFor(window, "2026-09-25")).toBe("2026-09-25");
    expect(pageStartFor(window, "2026-10-08")).toBe("2026-09-25");
    expect(pageStartFor(window, "2026-10-09")).toBe("2026-10-09");
    expect(pageStartFor(window, "2026-10-20")).toBe("2026-10-09");
    expect(pageStartFor(window, "2026-09-01")).toBe("2026-09-25");
  });

  it("ignores a start outside the window or not a date at all", () => {
    ["2026-09-01", "2027-01-01", "tomorrow", ["2026-10-09"]].forEach((requested) =>
      expect(pickerRange(window, requested).start).toBe("2026-09-25"),
    );
  });
});
