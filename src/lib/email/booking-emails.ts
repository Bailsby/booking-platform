import { formatAppointment, formatDuration } from "../format";
import { calendarInvite } from "./ics";
import type { Email } from "./send";

export type BookingEmailKind = "confirmed" | "rescheduled" | "cancelled";

export type BookingEmailInput = {
  kind: BookingEmailKind;
  bookingId: string;
  sequence: number;
  business: {
    name: string;
    timeZone: string;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
  service: { name: string; durationMinutes: number };
  customer: { name: string; email: string };
  startsAt: Date;
  endsAt: Date;
  /** The old time, for a reschedule. */
  previousStartsAt?: Date;
  notes: string | null;
  manageUrl: string;
  siteUrl: string;
  /** Calendar organiser when the business has no email of its own. */
  fallbackOrganizerEmail: string;
  now: Date;
};

const escapeHtml = (value: string): string =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const firstName = (name: string) => name.split(" ")[0];

const subjectFor = (input: BookingEmailInput, when: string): string =>
  ({
    confirmed: `Booking confirmed: ${input.service.name}, ${when}`,
    rescheduled: `Booking moved: ${input.service.name} is now ${when}`,
    cancelled: `Booking cancelled: ${input.service.name}, ${when}`,
  })[input.kind];

const introFor = (input: BookingEmailInput, when: string): string =>
  ({
    confirmed: `You're booked in for a ${input.service.name} on ${when}.`,
    rescheduled: `Your ${input.service.name} has moved${
      input.previousStartsAt
        ? ` from ${formatAppointment(input.previousStartsAt, input.business.timeZone)}`
        : ""
    } to ${when}.`,
    cancelled: `Your ${input.service.name} on ${when} has been cancelled.`,
  })[input.kind];

export const bookingEmail = (input: BookingEmailInput): Email => {
  const { business, service, customer, kind } = input;
  const when = formatAppointment(input.startsAt, business.timeZone);
  const cancelled = kind === "cancelled";

  const details: [string, string][] = [
    ["Appointment", service.name],
    ["When", when],
    ["Length", formatDuration(service.durationMinutes)],
    ...(business.address ? ([["Where", `${business.name}, ${business.address}`]] as [string, string][]) : []),
    ...(input.notes ? ([["Your notes", input.notes]] as [string, string][]) : []),
  ];

  const action = cancelled
    ? { label: "Book another appointment", url: input.siteUrl }
    : { label: "Reschedule or cancel", url: input.manageUrl };

  const contact = business.phone
    ? `Questions? Reply to this email or call us on ${business.phone}.`
    : "Questions? Just reply to this email.";

  const text = [
    `Hi ${firstName(customer.name)},`,
    "",
    introFor(input, when),
    "",
    ...(cancelled ? [] : details.map(([label, value]) => `${label}: ${value}`)),
    ...(cancelled ? [] : [""]),
    `${action.label}: ${action.url}`,
    "",
    contact,
    "",
    business.name,
  ].join("\n");

  const html = `<!doctype html>
<html><body style="margin:0;padding:24px;background:#f6f3ee;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#2b2622">
<div style="max-width:520px;margin:0 auto;background:#fff;border-radius:12px;padding:28px">
<p style="margin:0 0 4px;font-size:13px;color:#7a6f66">${escapeHtml(business.name)}</p>
<h1 style="margin:0 0 16px;font-size:22px">${escapeHtml(
    { confirmed: "You're booked in", rescheduled: "Your booking has moved", cancelled: "Booking cancelled" }[kind],
  )}</h1>
<p style="margin:0 0 20px;line-height:1.5">Hi ${escapeHtml(firstName(customer.name))}, ${escapeHtml(
    introFor(input, when).replace(/^Y/, "y"),
  )}</p>
${
  cancelled
    ? ""
    : `<table style="width:100%;border-collapse:collapse;margin:0 0 24px;font-size:15px">${details
        .map(
          ([label, value]) =>
            `<tr><td style="padding:6px 12px 6px 0;color:#7a6f66;vertical-align:top;white-space:nowrap">${escapeHtml(
              label,
            )}</td><td style="padding:6px 0">${escapeHtml(value)}</td></tr>`,
        )
        .join("")}</table>`
}
<a href="${escapeHtml(action.url)}" style="display:inline-block;background:#1f6f63;color:#fff;text-decoration:none;padding:12px 20px;border-radius:8px;font-weight:600">${escapeHtml(
    action.label,
  )}</a>
<p style="margin:24px 0 0;font-size:13px;color:#7a6f66;line-height:1.5">${escapeHtml(contact)}</p>
</div></body></html>`;

  const method = cancelled ? "CANCEL" : "REQUEST";
  const organizerEmail = business.email ?? input.fallbackOrganizerEmail;

  return {
    to: customer.email,
    subject: subjectFor(input, when),
    text,
    html,
    replyTo: business.email ?? undefined,
    idempotencyKey: `${input.bookingId}:${kind}:${input.sequence}`,
    attachments: [
      {
        filename: "invite.ics",
        contentType: `text/calendar; method=${method}; charset=UTF-8`,
        content: calendarInvite({
          uid: `${input.bookingId}@booking-platform`,
          sequence: input.sequence,
          method,
          start: input.startsAt,
          end: input.endsAt,
          summary: `${service.name} at ${business.name}`,
          description: cancelled ? "This appointment has been cancelled." : `Reschedule or cancel: ${input.manageUrl}`,
          location: business.address ? `${business.name}, ${business.address}` : business.name,
          organizer: { name: business.name, email: organizerEmail },
          attendee: { name: customer.name, email: customer.email },
          stamp: input.now,
        }),
      },
    ],
  };
};
