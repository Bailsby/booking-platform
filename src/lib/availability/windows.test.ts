import { describe, expect, it } from "vitest";
import { mergeWindows, subtractWindow } from "./windows";

describe("mergeWindows", () => {
  it("sorts and joins overlapping and touching windows", () => {
    expect(
      mergeWindows([
        { start: 600, end: 700 },
        { start: 540, end: 600 },
        { start: 800, end: 900 },
        { start: 850, end: 870 },
      ]),
    ).toEqual([
      { start: 540, end: 700 },
      { start: 800, end: 900 },
    ]);
  });

  it("does not mutate its input", () => {
    const input = [
      { start: 600, end: 700 },
      { start: 540, end: 560 },
    ];
    mergeWindows(input);
    expect(input[0].start).toBe(600);
  });
});

describe("subtractWindow", () => {
  const day = [{ start: 540, end: 1020 }];

  it("splits a window around a cut in the middle", () => {
    expect(subtractWindow(day, { start: 720, end: 780 })).toEqual([
      { start: 540, end: 720 },
      { start: 780, end: 1020 },
    ]);
  });

  it("trims a cut overlapping one edge", () => {
    expect(subtractWindow(day, { start: 480, end: 600 })).toEqual([{ start: 600, end: 1020 }]);
    expect(subtractWindow(day, { start: 960, end: 1100 })).toEqual([{ start: 540, end: 960 }]);
  });

  it("removes a window the cut covers entirely", () => {
    expect(subtractWindow(day, { start: 0, end: 1440 })).toEqual([]);
  });

  it("leaves windows the cut doesn't touch, including ones it only abuts", () => {
    expect(subtractWindow(day, { start: 1020, end: 1080 })).toEqual(day);
  });
});
