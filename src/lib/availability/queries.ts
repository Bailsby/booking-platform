import { prisma } from "@/lib/prisma";
import { addDays, localDateOf, localToInstant, type LocalDate } from "./local-date";
import { bookableSlots, type DaySlots } from "./slots";

const MS_PER_MINUTE = 60 * 1000;

// Prisma returns a @db.Date column as a Date at UTC midnight.
const toLocalDate = (date: Date): LocalDate => date.toISOString().slice(0, 10);

/**
 * Bookable slots for a service over the next `days` days, starting today in
 * the business's zone and capped at how far ahead the business takes bookings.
 */
export const getAvailability = async (
  serviceId: string,
  days: number,
  now: Date = new Date(),
): Promise<DaySlots[]> => {
  const service = await prisma.service.findUniqueOrThrow({
    where: { id: serviceId },
    include: { business: { include: { rules: true } } },
  });
  const { business } = service;

  const from = localDateOf(now, business.timeZone);
  const to = addDays(from, Math.min(days, business.maxAdvanceDays) - 1);

  // A day either side, so a booking whose buffers straddle midnight still
  // counts against the first and last dates.
  const rangeStart = localToInstant(addDays(from, -1), 0, business.timeZone);
  const rangeEnd = localToInstant(addDays(to, 2), 0, business.timeZone);

  const [exceptions, bookings] = await Promise.all([
    prisma.availabilityException.findMany({
      where: {
        businessId: business.id,
        date: { gte: new Date(`${from}T00:00:00Z`), lte: new Date(`${to}T00:00:00Z`) },
      },
    }),
    prisma.booking.findMany({
      where: {
        businessId: business.id,
        status: { not: "CANCELLED" },
        blockedFrom: { lt: rangeEnd },
        blockedUntil: { gt: rangeStart },
      },
      select: { blockedFrom: true, blockedUntil: true },
    }),
  ]);

  return bookableSlots({
    timeZone: business.timeZone,
    from,
    to,
    rules: business.rules,
    exceptions: exceptions.map((exception) => ({ ...exception, date: toLocalDate(exception.date) })),
    blocked: bookings.map((booking) => ({ from: booking.blockedFrom, until: booking.blockedUntil })),
    service,
    slotIntervalMinutes: business.slotIntervalMinutes,
    earliestStart: new Date(now.getTime() + business.minNoticeMinutes * MS_PER_MINUTE),
  });
};
