import { describe, expect, it } from "vitest";
import { bookingEmail, type BookingEmailInput } from "./booking-emails";

const input: BookingEmailInput = {
  kind: "confirmed",
  bookingId: "bk1",
  sequence: 0,
  business: {
    name: "Muddy Paws Grooming",
    timeZone: "Europe/London",
    address: "Headingley, Leeds",
    phone: "0113 496 0123",
    email: "hello@muddypaws.example",
  },
  service: { name: "Full Groom — Large Dog", durationMinutes: 90 },
  customer: { name: "Hannah Lee", email: "hannah@example.com" },
  startsAt: new Date("2026-09-29T09:30:00Z"),
  endsAt: new Date("2026-09-29T11:00:00Z"),
  notes: "Bear, Bernese <3",
  manageUrl: "https://book.example/bookings/bk1?token=t",
  siteUrl: "https://book.example",
  fallbackOrganizerEmail: "bookings@example.com",
  now: new Date("2026-09-25T12:00:00Z"),
};

describe("bookingEmail", () => {
  it("confirms in the business's local time with a manage link", () => {
    const email = bookingEmail(input);
    expect(email.to).toBe("hannah@example.com");
    expect(email.subject).toBe(
      "Booking confirmed: Full Groom — Large Dog, Tuesday 29 September at 10:30",
    );
    expect(email.text).toContain("Hi Hannah,");
    expect(email.text).toContain("Length: 1 hr 30 min");
    expect(email.text).toContain("Reschedule or cancel: https://book.example/bookings/bk1?token=t");
    expect(email.html).toContain('href="https://book.example/bookings/bk1?token=t"');
  });

  it("escapes customer-supplied text in the HTML", () => {
    const email = bookingEmail({ ...input, customer: { ...input.customer, name: "<b>Hannah</b>" } });
    expect(email.html).not.toContain("<b>Hannah");
    expect(email.html).toContain("&lt;b&gt;Hannah&lt;/b&gt;");
    expect(email.html).toContain("Bear, Bernese &lt;3");
  });

  it("replies to the business and attaches a calendar invite", () => {
    const email = bookingEmail(input);
    expect(email.replyTo).toBe("hello@muddypaws.example");
    const [invite] = email.attachments ?? [];
    expect(invite.filename).toBe("invite.ics");
    expect(invite.contentType).toContain("method=REQUEST");
    expect(invite.content).toContain("ORGANIZER;CN=\"Muddy Paws Grooming\":mailto:hello@muddypaws.example");
  });

  it("describes a reschedule with both the old and new times", () => {
    const email = bookingEmail({
      ...input,
      kind: "rescheduled",
      sequence: 1,
      previousStartsAt: new Date("2026-09-29T08:00:00Z"),
      startsAt: new Date("2026-10-01T13:00:00Z"),
    });
    expect(email.subject).toBe("Booking moved: Full Groom — Large Dog is now Thursday 1 October at 14:00");
    expect(email.text).toContain("from Tuesday 29 September at 09:00 to Thursday 1 October at 14:00");
    expect(email.attachments?.[0].content).toContain("SEQUENCE:1");
  });

  it("sends a cancelling invite, and no manage link, for a cancellation", () => {
    const email = bookingEmail({ ...input, kind: "cancelled", sequence: 2 });
    expect(email.subject).toMatch(/^Booking cancelled/);
    expect(email.text).not.toContain("token=");
    expect(email.text).toContain("Book another appointment: https://book.example");
    expect(email.attachments?.[0].contentType).toContain("method=CANCEL");
  });

  it("keys idempotency on the booking, the kind of email and the sequence", () => {
    expect(bookingEmail(input).idempotencyKey).toBe("bk1:confirmed:0");
    expect(bookingEmail({ ...input, kind: "rescheduled", sequence: 1 }).idempotencyKey).toBe(
      "bk1:rescheduled:1",
    );
  });

  it("falls back to the sending address when the business has no email", () => {
    const email = bookingEmail({ ...input, business: { ...input.business, email: null } });
    expect(email.replyTo).toBeUndefined();
    expect(email.attachments?.[0].content).toContain("mailto:bookings@example.com");
  });
});
