// A minimal iCalendar (RFC 5545) writer for booking invites. Hand-rolled
// because a booking needs a single VEVENT, and the rules that matter — CRLF
// line endings, escaping, folding at 75 octets — fit in a page.

export type CalendarInvite = {
  /** Stable across updates, so a reschedule replaces the event rather than adding one. */
  uid: string;
  /** Must increase with each update for calendar apps to apply it. */
  sequence: number;
  method: "REQUEST" | "CANCEL";
  start: Date;
  end: Date;
  summary: string;
  description: string;
  location: string;
  organizer: { name: string; email: string };
  attendee: { name: string; email: string };
  /** When the file was generated. */
  stamp: Date;
};

const utc = (date: Date): string => date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");

/** Escapes TEXT values per RFC 5545 §3.3.11. */
export const escapeText = (value: string): string =>
  value.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");

// Parameter values containing : ; or , must be quoted, and can't contain quotes.
const param = (value: string): string => `"${value.replace(/"/g, "'")}"`;

/**
 * Splits a content line into chunks of at most 75 octets, continuation lines
 * starting with a space. Splits on character boundaries so multi-byte UTF-8
 * (an em dash in a service name, say) is never cut in half.
 */
export const foldLine = (line: string): string =>
  Array.from(line)
    .reduce<string[]>(
      (lines, char) => {
        const current = lines[lines.length - 1];
        // Continuation lines spend one octet on the leading space.
        const limit = lines.length === 1 ? 75 : 74;
        return Buffer.byteLength(current + char) > limit
          ? [...lines, char]
          : [...lines.slice(0, -1), current + char];
      },
      [""],
    )
    .join("\r\n ");

export const calendarInvite = (invite: CalendarInvite): string =>
  [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Booking Platform//EN",
    "CALSCALE:GREGORIAN",
    `METHOD:${invite.method}`,
    "BEGIN:VEVENT",
    `UID:${invite.uid}`,
    `SEQUENCE:${invite.sequence}`,
    `DTSTAMP:${utc(invite.stamp)}`,
    `DTSTART:${utc(invite.start)}`,
    `DTEND:${utc(invite.end)}`,
    `SUMMARY:${escapeText(invite.summary)}`,
    `DESCRIPTION:${escapeText(invite.description)}`,
    `LOCATION:${escapeText(invite.location)}`,
    `ORGANIZER;CN=${param(invite.organizer.name)}:mailto:${invite.organizer.email}`,
    `ATTENDEE;CN=${param(invite.attendee.name)};ROLE=REQ-PARTICIPANT;PARTSTAT=ACCEPTED:mailto:${invite.attendee.email}`,
    `STATUS:${invite.method === "CANCEL" ? "CANCELLED" : "CONFIRMED"}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ]
    .map(foldLine)
    .join("\r\n") + "\r\n";
