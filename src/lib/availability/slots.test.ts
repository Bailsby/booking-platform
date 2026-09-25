import { describe, expect, it } from "vitest";
import { bookableSlots, openWindowsOn, type DateException, type SlotQuery } from "./slots";

const hm = (hours: number, minutes = 0) => hours * 60 + minutes;

// Tuesdays 09:00–17:00 with a lunch break, Saturdays 09:00–13:00.
const rules = [
  { dayOfWeek: 2, startMinute: hm(9), endMinute: hm(12, 30) },
  { dayOfWeek: 2, startMinute: hm(13, 30), endMinute: hm(17) },
  { dayOfWeek: 6, startMinute: hm(9), endMinute: hm(13) },
];

const query = (overrides: Partial<SlotQuery> = {}): SlotQuery => ({
  timeZone: "Europe/London",
  from: "2026-06-02", // a Tuesday, during BST
  to: "2026-06-02",
  rules,
  exceptions: [],
  blocked: [],
  service: { durationMinutes: 60, bufferBeforeMinutes: 0, bufferAfterMinutes: 0 },
  slotIntervalMinutes: 30,
  earliestStart: new Date("2026-01-01T00:00:00Z"),
  ...overrides,
});

/** Slot start times as ISO strings, for readable assertions. */
const starts = (q: SlotQuery) =>
  bookableSlots(q).flatMap((day) => day.slots.map((slot) => slot.startsAt.toISOString()));

describe("openWindowsOn", () => {
  const closedAllDay: DateException = {
    date: "2026-06-02",
    kind: "CLOSED",
    startMinute: null,
    endMinute: null,
  };

  it("uses the weekly rules for that weekday", () => {
    expect(openWindowsOn("2026-06-02", rules, [])).toEqual([
      { start: hm(9), end: hm(12, 30) },
      { start: hm(13, 30), end: hm(17) },
    ]);
    expect(openWindowsOn("2026-06-01", rules, [])).toEqual([]);
  });

  it("closes the whole day for a closure without times", () => {
    expect(openWindowsOn("2026-06-02", rules, [closedAllDay])).toEqual([]);
  });

  it("removes only the window of a partial closure", () => {
    const vetVisit: DateException = { ...closedAllDay, startMinute: hm(10), endMinute: hm(11) };
    expect(openWindowsOn("2026-06-02", rules, [vetVisit])).toEqual([
      { start: hm(9), end: hm(10) },
      { start: hm(11), end: hm(12, 30) },
      { start: hm(13, 30), end: hm(17) },
    ]);
  });

  it("adds extra openings, merged with the usual hours", () => {
    const lateNight: DateException = {
      date: "2026-06-02",
      kind: "OPEN",
      startMinute: hm(17),
      endMinute: hm(19),
    };
    expect(openWindowsOn("2026-06-02", rules, [lateNight])).toEqual([
      { start: hm(9), end: hm(12, 30) },
      { start: hm(13, 30), end: hm(19) },
    ]);
  });

  it("lets a closure win over an opening on the same date", () => {
    const extra: DateException = { ...closedAllDay, kind: "OPEN", startMinute: hm(18), endMinute: hm(19) };
    expect(openWindowsOn("2026-06-02", rules, [extra, closedAllDay])).toEqual([]);
  });

  it("ignores exceptions for other dates", () => {
    expect(openWindowsOn("2026-06-02", rules, [{ ...closedAllDay, date: "2026-06-09" }])).toHaveLength(2);
  });
});

describe("bookableSlots", () => {
  it("offers every interval at which the appointment fits inside opening hours", () => {
    expect(starts(query())).toEqual([
      // 09:00–12:30 BST; the last hour-long slot starts at 11:30.
      "2026-06-02T08:00:00.000Z",
      "2026-06-02T08:30:00.000Z",
      "2026-06-02T09:00:00.000Z",
      "2026-06-02T09:30:00.000Z",
      "2026-06-02T10:00:00.000Z",
      "2026-06-02T10:30:00.000Z",
      // 13:30–17:00 BST; nothing spans the lunch break.
      "2026-06-02T12:30:00.000Z",
      "2026-06-02T13:00:00.000Z",
      "2026-06-02T13:30:00.000Z",
      "2026-06-02T14:00:00.000Z",
      "2026-06-02T14:30:00.000Z",
      "2026-06-02T15:00:00.000Z",
    ]);
  });

  it("returns one entry per date, empty on closed days", () => {
    const days = bookableSlots(query({ from: "2026-06-01", to: "2026-06-03" }));
    expect(days.map((day) => [day.date, day.slots.length])).toEqual([
      ["2026-06-01", 0],
      ["2026-06-02", 12],
      ["2026-06-03", 0],
    ]);
  });

  it("offers nothing when the service is longer than any window", () => {
    const fullDay = { durationMinutes: 240, bufferBeforeMinutes: 0, bufferAfterMinutes: 0 };
    expect(starts(query({ service: fullDay }))).toEqual([]);
  });

  it("gives each slot the service's duration", () => {
    const [first] = bookableSlots(query({ service: { durationMinutes: 90, bufferBeforeMinutes: 0, bufferAfterMinutes: 0 } }))[0].slots;
    expect(first.endsAt.getTime() - first.startsAt.getTime()).toBe(90 * 60 * 1000);
  });

  it("offers nothing before the earliest allowed start", () => {
    expect(starts(query({ earliestStart: new Date("2026-06-02T13:45:00Z") }))).toEqual([
      "2026-06-02T14:00:00.000Z",
      "2026-06-02T14:30:00.000Z",
      "2026-06-02T15:00:00.000Z",
    ]);
  });

  describe("existing bookings", () => {
    // A booking blocking 10:00–11:15 BST (a groom plus 15 minutes' clean-down).
    const blocked = [
      { from: new Date("2026-06-02T09:00:00Z"), until: new Date("2026-06-02T10:15:00Z") },
    ];
    const morning = (q: SlotQuery) => starts(q).filter((iso) => iso < "2026-06-02T12:00:00.000Z");

    it("removes slots that overlap blocked time", () => {
      expect(morning(query({ blocked }))).toEqual([
        "2026-06-02T08:00:00.000Z", // 09:00–10:00 ends exactly as the booking starts
        "2026-06-02T10:30:00.000Z", // first start after the booking's clean-down
      ]);
    });

    it("keeps the new appointment's own buffers clear of other bookings", () => {
      const withBuffers = { durationMinutes: 60, bufferBeforeMinutes: 15, bufferAfterMinutes: 15 };
      expect(morning(query({ blocked, service: withBuffers }))).toEqual([
        // 09:00 would need until 10:15 clear; 10:30 needs from 10:15, which is free.
        "2026-06-02T10:30:00.000Z",
      ]);
    });

    it("lets buffers run outside opening hours", () => {
      const withBuffers = { durationMinutes: 60, bufferBeforeMinutes: 30, bufferAfterMinutes: 30 };
      const all = starts(query({ service: withBuffers }));
      expect(all[0]).toBe("2026-06-02T08:00:00.000Z");
      expect(all.at(-1)).toBe("2026-06-02T15:00:00.000Z");
    });
  });

  describe("across DST changes", () => {
    it("keeps a 09:00 opening at 09:00 local when the clocks go forward (London)", () => {
      const firstSlots = bookableSlots(
        query({ from: "2026-03-24", to: "2026-03-31" }),
      )
        .filter((day) => day.slots.length > 0)
        .map((day) => [day.date, day.slots[0].startsAt.toISOString()]);

      expect(firstSlots).toEqual([
        ["2026-03-24", "2026-03-24T09:00:00.000Z"], // GMT
        ["2026-03-28", "2026-03-28T09:00:00.000Z"], // GMT, the day before the change
        ["2026-03-31", "2026-03-31T08:00:00.000Z"], // BST
      ]);
    });

    it("keeps it at 09:00 local when the clocks go back (London)", () => {
      const firstSlots = bookableSlots(query({ from: "2026-10-24", to: "2026-10-31" }))
        .filter((day) => day.slots.length > 0)
        .map((day) => [day.date, day.slots[0].startsAt.toISOString()]);

      expect(firstSlots).toEqual([
        ["2026-10-24", "2026-10-24T08:00:00.000Z"], // BST, the day before the change
        ["2026-10-27", "2026-10-27T09:00:00.000Z"], // GMT
        ["2026-10-31", "2026-10-31T09:00:00.000Z"], // GMT
      ]);
    });

    it("resolves opening hours on the day of the change itself", () => {
      const sundayOpening: DateException = {
        date: "2026-03-29",
        kind: "OPEN",
        startMinute: hm(10),
        endMinute: hm(11),
      };
      expect(starts(query({ from: "2026-03-29", to: "2026-03-29", exceptions: [sundayOpening] }))).toEqual([
        "2026-03-29T09:00:00.000Z", // 10:00 BST
      ]);
    });

    it("uses the business's zone rather than assuming London", () => {
      // US clocks change on 8 March, three weeks before the UK's.
      const nyTuesdays = bookableSlots(
        query({ timeZone: "America/New_York", from: "2026-03-03", to: "2026-03-10" }),
      )
        .filter((day) => day.slots.length > 0 && day.date !== "2026-03-07")
        .map((day) => day.slots[0].startsAt.toISOString());

      expect(nyTuesdays).toEqual([
        "2026-03-03T14:00:00.000Z", // 09:00 EST
        "2026-03-10T13:00:00.000Z", // 09:00 EDT
      ]);
    });
  });

  it("rejects a non-positive slot interval rather than looping forever", () => {
    expect(() => bookableSlots(query({ slotIntervalMinutes: 0 }))).toThrow(RangeError);
  });
});
