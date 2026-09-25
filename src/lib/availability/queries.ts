import { prisma } from "@/lib/prisma";
import { addDays, localDateOf, localToInstant, type LocalDate } from "./local-date";
import { bookableSlots, type DaySlots } from "./slots";

const MS_PER_MINUTE = 60 * 1000;

// Prisma returns a @db.Date column as a Date at UTC midnight.
const toLocalDate = (date: Date): LocalDate => date.toISOString().slice(0, 10);

export type AvailabilityOptions = {
  /** First date to show; defaults to, and can't be earlier than, today. */
  from?: LocalDate;
  days: number;
  now?: Date;
  /** Leave this booking's time free — for rescheduling it. */
  ignoreBookingId?: string;
};

/** The dates a business currently takes bookings for, both inclusive. */
export const bookingWindow = (
  business: { timeZone: string; maxAdvanceDays: number },
  now: Date = new Date(),
): { first: LocalDate; last: LocalDate } => {
  const first = localDateOf(now, business.timeZone);
  return { first, last: addDays(first, business.maxAdvanceDays - 1) };
};

/**
 * Bookable slots for a service over a run of days, clipped to the business's
 * booking window.
 */
export const getAvailability = async (
  serviceId: string,
  { from, days, now = new Date(), ignoreBookingId }: AvailabilityOptions,
): Promise<DaySlots[]> => {
  const service = await prisma.service.findUniqueOrThrow({
    where: { id: serviceId },
    include: { business: { include: { rules: true } } },
  });
  const { business } = service;

  // ISO dates compare correctly as strings.
  const window = bookingWindow(business, now);
  const start = from && from > window.first ? from : window.first;
  const requestedEnd = addDays(start, days - 1);
  const end = requestedEnd < window.last ? requestedEnd : window.last;
  if (end < start) return [];

  // A day either side, so a booking whose buffers straddle midnight still
  // counts against the first and last dates.
  const rangeStart = localToInstant(addDays(start, -1), 0, business.timeZone);
  const rangeEnd = localToInstant(addDays(end, 2), 0, business.timeZone);

  const [exceptions, bookings] = await Promise.all([
    prisma.availabilityException.findMany({
      where: {
        businessId: business.id,
        date: { gte: new Date(`${start}T00:00:00Z`), lte: new Date(`${end}T00:00:00Z`) },
      },
    }),
    prisma.booking.findMany({
      where: {
        businessId: business.id,
        status: { not: "CANCELLED" },
        blockedFrom: { lt: rangeEnd },
        blockedUntil: { gt: rangeStart },
        ...(ignoreBookingId ? { id: { not: ignoreBookingId } } : {}),
      },
      select: { blockedFrom: true, blockedUntil: true },
    }),
  ]);

  return bookableSlots({
    timeZone: business.timeZone,
    from: start,
    to: end,
    rules: business.rules,
    exceptions: exceptions.map((exception) => ({ ...exception, date: toLocalDate(exception.date) })),
    blocked: bookings.map((booking) => ({ from: booking.blockedFrom, until: booking.blockedUntil })),
    service,
    slotIntervalMinutes: business.slotIntervalMinutes,
    earliestStart: new Date(now.getTime() + business.minNoticeMinutes * MS_PER_MINUTE),
  });
};

/**
 * Whether `startsAt` is a slot the engine would offer right now. Every write
 * re-checks this rather than trusting the time the browser sent back, which
 * could be stale or made up.
 */
export const isSlotOffered = async (
  serviceId: string,
  startsAt: Date,
  options: Pick<AvailabilityOptions, "now" | "ignoreBookingId"> = {},
): Promise<boolean> => {
  const { business } = await prisma.service.findUniqueOrThrow({
    where: { id: serviceId },
    select: { business: { select: { timeZone: true } } },
  });
  const date = localDateOf(startsAt, business.timeZone);
  const [day] = await getAvailability(serviceId, { ...options, from: date, days: 1 });
  return (
    day?.date === date && day.slots.some((slot) => slot.startsAt.getTime() === startsAt.getTime())
  );
};
