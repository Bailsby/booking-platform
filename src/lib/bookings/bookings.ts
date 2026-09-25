import type { Prisma } from "@/generated/prisma/client";
import { isSlotOffered } from "@/lib/availability/queries";
import { prisma } from "@/lib/prisma";
import type { CustomerDetails } from "./customer-details";
import { isOverlapError } from "./overlap-error";

const MS_PER_MINUTE = 60 * 1000;

const bookingInclude = { service: true, business: true, customer: true } as const;
export type FullBooking = Prisma.BookingGetPayload<{ include: typeof bookingInclude }>;

export type BookingFailure = "not-found" | "slot-unavailable" | "not-changeable";
type Failure = { ok: false; reason: BookingFailure };
const fail = (reason: BookingFailure): Failure => ({ ok: false, reason });

type Timing = { durationMinutes: number; bufferBeforeMinutes: number; bufferAfterMinutes: number };

const timesFor = (service: Timing, startsAt: Date) => {
  const endsAt = new Date(startsAt.getTime() + service.durationMinutes * MS_PER_MINUTE);
  return {
    startsAt,
    endsAt,
    blockedFrom: new Date(startsAt.getTime() - service.bufferBeforeMinutes * MS_PER_MINUTE),
    blockedUntil: new Date(endsAt.getTime() + service.bufferAfterMinutes * MS_PER_MINUTE),
  };
};

// Only a confirmed booking that hasn't started yet can be moved or cancelled.
const changeableWhere = (id: string, now: Date) => ({
  id,
  status: "CONFIRMED" as const,
  startsAt: { gt: now },
});

export const isChangeable = (booking: { status: string; startsAt: Date }, now: Date = new Date()) =>
  booking.status === "CONFIRMED" && booking.startsAt > now;

export const findBooking = (id: string): Promise<FullBooking | null> =>
  prisma.booking.findUnique({ where: { id }, include: bookingInclude });

export const createBooking = async ({
  serviceId,
  startsAt,
  details,
  now = new Date(),
}: {
  serviceId: string;
  startsAt: Date;
  details: CustomerDetails;
  now?: Date;
}): Promise<{ ok: true; booking: FullBooking } | Failure> => {
  const service = await prisma.service.findFirst({ where: { id: serviceId, active: true } });
  if (!service) return fail("not-found");
  if (!(await isSlotOffered(serviceId, startsAt, { now }))) return fail("slot-unavailable");

  try {
    const booking = await prisma.$transaction(async (tx) => {
      // A returning customer is matched on email; their latest name and phone win.
      const customer = await tx.customer.upsert({
        where: { businessId_email: { businessId: service.businessId, email: details.email } },
        update: { name: details.name, phone: details.phone },
        create: {
          businessId: service.businessId,
          name: details.name,
          email: details.email,
          phone: details.phone,
        },
      });
      return tx.booking.create({
        data: {
          businessId: service.businessId,
          serviceId,
          customerId: customer.id,
          notes: details.notes,
          ...timesFor(service, startsAt),
        },
        include: bookingInclude,
      });
    });
    return { ok: true, booking };
  } catch (error) {
    // Someone else took the slot between the availability check and the insert.
    if (isOverlapError(error)) return fail("slot-unavailable");
    throw error;
  }
};

export const rescheduleBooking = async ({
  bookingId,
  startsAt,
  now = new Date(),
}: {
  bookingId: string;
  startsAt: Date;
  now?: Date;
}): Promise<{ ok: true; booking: FullBooking; previousStartsAt: Date } | Failure> => {
  const booking = await findBooking(bookingId);
  if (!booking) return fail("not-found");
  if (!isChangeable(booking, now)) return fail("not-changeable");
  if (!(await isSlotOffered(booking.serviceId, startsAt, { now, ignoreBookingId: booking.id }))) {
    return fail("slot-unavailable");
  }

  try {
    // Conditional on the booking still being changeable, in case it was
    // cancelled in another tab since it was read.
    const { count } = await prisma.booking.updateMany({
      where: changeableWhere(booking.id, now),
      data: { ...timesFor(booking.service, startsAt), sequence: { increment: 1 } },
    });
    if (count === 0) return fail("not-changeable");
  } catch (error) {
    if (isOverlapError(error)) return fail("slot-unavailable");
    throw error;
  }

  const updated = await findBooking(booking.id);
  return updated
    ? { ok: true, booking: updated, previousStartsAt: booking.startsAt }
    : fail("not-found");
};

export const cancelBooking = async ({
  bookingId,
  now = new Date(),
}: {
  bookingId: string;
  now?: Date;
}): Promise<{ ok: true; booking: FullBooking } | Failure> => {
  const { count } = await prisma.booking.updateMany({
    where: changeableWhere(bookingId, now),
    data: { status: "CANCELLED", cancelledAt: now, sequence: { increment: 1 } },
  });
  const booking = await findBooking(bookingId);
  if (!booking) return fail("not-found");
  return count === 0 ? fail("not-changeable") : { ok: true, booking };
};
