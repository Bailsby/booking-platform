import { describe, expect, it } from "vitest";
import { addDays, dayOfWeek, eachLocalDate, isLocalDate, localDateOf, localToInstant } from "./local-date";

describe("dayOfWeek", () => {
  it("numbers days from Sunday = 0", () => {
    expect(dayOfWeek("2026-09-27")).toBe(0);
    expect(dayOfWeek("2026-09-29")).toBe(2);
  });

  it("rejects malformed and impossible dates", () => {
    expect(() => dayOfWeek("2026-9-29")).toThrow(RangeError);
    expect(() => dayOfWeek("2026-02-30")).toThrow(RangeError);
  });
});

describe("isLocalDate", () => {
  it("accepts real dates and rejects everything else", () => {
    expect(isLocalDate("2026-09-29")).toBe(true);
    ["2026-02-30", "2026-9-29", "29/09/2026", "", undefined, ["2026-09-29"], 20260929].forEach((value) =>
      expect(isLocalDate(value)).toBe(false),
    );
  });
});

describe("addDays / eachLocalDate", () => {
  it("crosses month and year ends", () => {
    expect(addDays("2026-12-31", 1)).toBe("2027-01-01");
  });

  it("counts each calendar day once across a DST change", () => {
    expect(eachLocalDate("2026-03-28", "2026-03-30")).toEqual([
      "2026-03-28",
      "2026-03-29",
      "2026-03-30",
    ]);
  });

  it("returns nothing when the range is backwards", () => {
    expect(eachLocalDate("2026-03-30", "2026-03-28")).toEqual([]);
  });
});

describe("localToInstant", () => {
  it("keeps local wall-clock time fixed across a DST change", () => {
    expect(localToInstant("2026-03-24", 9 * 60, "Europe/London").toISOString()).toBe(
      "2026-03-24T09:00:00.000Z",
    );
    expect(localToInstant("2026-03-31", 9 * 60, "Europe/London").toISOString()).toBe(
      "2026-03-31T08:00:00.000Z",
    );
  });

  it("treats minute 1440 as the following midnight", () => {
    expect(localToInstant("2026-06-02", 1440, "Europe/London").toISOString()).toBe(
      "2026-06-02T23:00:00.000Z",
    );
  });

  it("moves a time inside the spring-forward gap to the first one that exists", () => {
    // 01:30 doesn't exist in London on 29 March 2026; it becomes 02:30 BST.
    expect(localToInstant("2026-03-29", 90, "Europe/London").toISOString()).toBe(
      "2026-03-29T01:30:00.000Z",
    );
  });
});

describe("localDateOf", () => {
  it("uses the zone's date, not UTC's", () => {
    // 23:30 UTC in summer is already the next day in London.
    expect(localDateOf(new Date("2026-06-02T23:30:00Z"), "Europe/London")).toBe("2026-06-03");
    expect(localDateOf(new Date("2026-06-03T02:00:00Z"), "America/New_York")).toBe("2026-06-02");
  });
});
