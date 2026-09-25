import { describe, expect, it } from "vitest";
import { calendarInvite, escapeText, foldLine, type CalendarInvite } from "./ics";

const invite: CalendarInvite = {
  uid: "booking-1@booking-platform",
  sequence: 0,
  method: "REQUEST",
  start: new Date("2026-09-29T09:30:00Z"),
  end: new Date("2026-09-29T11:00:00Z"),
  summary: "Full Groom — Large Dog at Muddy Paws Grooming",
  description: "Bear, Bernese.\nManage your booking: https://example.com/bookings/1?token=abc",
  location: "Muddy Paws Grooming, Leeds",
  organizer: { name: "Muddy Paws Grooming", email: "hello@example.com" },
  attendee: { name: "Hannah Lee", email: "hannah@example.com" },
  stamp: new Date("2026-09-25T15:00:00.123Z"),
};

describe("escapeText", () => {
  it("escapes backslashes, separators and newlines", () => {
    expect(escapeText("a\\b; c, d\ne")).toBe("a\\\\b\\; c\\, d\\ne");
  });
});

describe("foldLine", () => {
  it("leaves short lines alone", () => {
    expect(foldLine("SUMMARY:Nail Trim")).toBe("SUMMARY:Nail Trim");
  });

  it("keeps every physical line within 75 octets", () => {
    const folded = foldLine(`DESCRIPTION:${"x".repeat(200)}`);
    const lines = folded.split("\r\n");
    expect(lines.length).toBeGreaterThan(1);
    lines.forEach((line) => expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75));
    expect(lines.slice(1).every((line) => line.startsWith(" "))).toBe(true);
  });

  it("never splits a multi-byte character", () => {
    const folded = foldLine(`SUMMARY:${"—".repeat(40)}`);
    folded.split("\r\n").forEach((line) => {
      expect(Buffer.byteLength(line)).toBeLessThanOrEqual(75);
      expect(line.replace(/^ /, "")).toMatch(/^(SUMMARY:)?—+$/);
    });
  });

  it("unfolds back to the original line", () => {
    const line = `DESCRIPTION:${"Full Groom — Large Dog ".repeat(10)}`;
    expect(foldLine(line).replace(/\r\n /g, "")).toBe(line);
  });
});

describe("calendarInvite", () => {
  const file = calendarInvite(invite);
  const unfolded = file.replace(/\r\n /g, "");

  it("uses CRLF line endings throughout", () => {
    expect(file.endsWith("\r\n")).toBe(true);
    expect(file.replace(/\r\n/g, "")).not.toMatch(/[\r\n]/);
  });

  it("writes times in UTC without milliseconds", () => {
    expect(unfolded).toContain("DTSTART:20260929T093000Z");
    expect(unfolded).toContain("DTEND:20260929T110000Z");
    expect(unfolded).toContain("DTSTAMP:20260925T150000Z");
  });

  it("escapes text values", () => {
    expect(unfolded).toContain("DESCRIPTION:Bear\\, Bernese.\\nManage your booking:");
  });

  it("marks a cancellation so calendars remove the event", () => {
    const cancelled = calendarInvite({ ...invite, method: "CANCEL", sequence: 2 });
    expect(cancelled).toContain("METHOD:CANCEL");
    expect(cancelled).toContain("STATUS:CANCELLED");
    expect(cancelled).toContain("SEQUENCE:2");
    expect(cancelled).toContain("UID:booking-1@booking-platform");
  });
});
