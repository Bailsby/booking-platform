import { describe, expect, it } from "vitest";
import { formatAppointment, formatDuration, formatLocalDate, formatPrice, formatTime } from "./format";

describe("formatPrice", () => {
  it("formats minor units as currency", () => {
    expect(formatPrice(4500, "GBP")).toBe("£45.00");
    expect(formatPrice(1250, "GBP")).toBe("£12.50");
  });
});

describe("formatDuration", () => {
  it.each([
    [15, "15 min"],
    [60, "1 hr"],
    [90, "1 hr 30 min"],
    [120, "2 hr"],
  ])("%i minutes → %s", (minutes, expected) => {
    expect(formatDuration(minutes)).toBe(expected);
  });
});

describe("formatTime / formatAppointment", () => {
  const instant = new Date("2026-09-29T09:30:00Z");

  it("uses the business's zone, not UTC", () => {
    expect(formatTime(instant, "Europe/London")).toBe("10:30");
    expect(formatAppointment(instant, "Europe/London")).toBe("Tuesday 29 September at 10:30");
  });

  it("moves to the right date near midnight", () => {
    expect(formatAppointment(new Date("2026-09-29T23:30:00Z"), "Europe/London")).toBe(
      "Wednesday 30 September at 00:30",
    );
  });
});

describe("formatLocalDate", () => {
  it("formats a calendar date without shifting it", () => {
    expect(formatLocalDate("2026-09-29")).toBe("Tuesday 29 September");
    expect(formatLocalDate("2026-09-29", { weekday: "short", day: "numeric" })).toBe("Tue 29");
  });
});
