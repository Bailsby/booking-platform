import type { LocalDate } from "./availability/local-date";

// Everything customer-facing is formatted in the business's zone, never the
// server's: Vercel runs in UTC, which is an hour out for half the UK year.

export const formatPrice = (minor: number, currency: string): string =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(minor / 100);

export const formatDuration = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return [hours > 0 ? `${hours} hr` : null, rest > 0 || hours === 0 ? `${rest} min` : null]
    .filter(Boolean)
    .join(" ");
};

export const formatTime = (instant: Date, timeZone: string): string =>
  new Intl.DateTimeFormat("en-GB", { timeZone, hour: "2-digit", minute: "2-digit" }).format(instant);

export const formatDate = (instant: Date, timeZone: string): string =>
  new Intl.DateTimeFormat("en-GB", {
    timeZone,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(instant);

/** e.g. "Tuesday 29 September at 10:30". */
export const formatAppointment = (instant: Date, timeZone: string): string =>
  `${formatDate(instant, timeZone)} at ${formatTime(instant, timeZone)}`;

/** A calendar date needs no zone; format it at UTC midnight so it can't shift. */
export const formatLocalDate = (
  date: LocalDate,
  options: Intl.DateTimeFormatOptions = { weekday: "long", day: "numeric", month: "long" },
): string =>
  new Intl.DateTimeFormat("en-GB", { ...options, timeZone: "UTC" }).format(
    new Date(`${date}T00:00:00Z`),
  );
