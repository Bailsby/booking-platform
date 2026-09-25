import { afterAll, beforeEach, describe, expect, it } from "vitest";
import { prisma } from "@/lib/prisma";
import { cancelBooking, createBooking, rescheduleBooking } from "./bookings";
import type { CustomerDetails } from "./customer-details";

// A Monday in BST. Open 09:00–17:00 local (08:00–16:00Z) every day, so the
// tests don't depend on which weekday a date falls on.
const now = new Date("2030-06-03T06:00:00Z");
const at = (utcTime: string) => new Date(`2030-06-03T${utcTime}:00Z`);

const sarah: CustomerDetails = {
  name: "Sarah Whitfield",
  email: "sarah@example.com",
  phone: "07700 900123",
  notes: "Biscuit, cockapoo",
};
const james: CustomerDetails = { ...sarah, name: "James Okafor", email: "james@example.com" };

let serviceId: string;

beforeEach(async () => {
  await prisma.$executeRawUnsafe(
    `TRUNCATE "Booking", "Customer", "AvailabilityException", "AvailabilityRule", "Service", "Business" CASCADE`,
  );
  const business = await prisma.business.create({
    data: {
      name: "Test Salon",
      timeZone: "Europe/London",
      minNoticeMinutes: 0,
      slotIntervalMinutes: 15,
      rules: {
        create: [0, 1, 2, 3, 4, 5, 6].map((dayOfWeek) => ({
          dayOfWeek,
          startMinute: 9 * 60,
          endMinute: 17 * 60,
        })),
      },
      services: {
        create: { name: "Full Groom", durationMinutes: 60, bufferAfterMinutes: 15, price: 4500 },
      },
    },
    include: { services: true },
  });
  serviceId = business.services[0].id;
});

afterAll(() => prisma.$disconnect());

const book = (startsAt: Date, details: CustomerDetails = sarah) =>
  createBooking({ serviceId, startsAt, details, now });

describe("createBooking", () => {
  it("confirms a booking with its buffered time range", async () => {
    const result = await book(at("09:00"));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.booking).toMatchObject({
      status: "CONFIRMED",
      startsAt: at("09:00"),
      endsAt: at("10:00"),
      blockedFrom: at("09:00"),
      blockedUntil: at("10:15"),
      notes: "Biscuit, cockapoo",
    });
  });

  it("reuses a returning customer, updating their details", async () => {
    await book(at("09:00"));
    await book(at("11:00"), { ...sarah, phone: "07700 900999" });
    const customers = await prisma.customer.findMany();
    expect(customers).toHaveLength(1);
    expect(customers[0].phone).toBe("07700 900999");
  });

  it("refuses a time the engine wouldn't offer", async () => {
    const offGrid = await book(at("09:07"));
    const beforeOpening = await book(at("07:00"));
    const inThePast = await book(at("05:00"));
    [offGrid, beforeOpening, inThePast].forEach((result) =>
      expect(result).toEqual({ ok: false, reason: "slot-unavailable" }),
    );
  });

  it("refuses a time that overlaps an existing booking or its buffer", async () => {
    await book(at("09:00"));
    expect(await book(at("09:30"), james)).toEqual({ ok: false, reason: "slot-unavailable" });
    expect(await book(at("10:00"), james)).toEqual({ ok: false, reason: "slot-unavailable" });
    expect((await book(at("10:15"), james)).ok).toBe(true);
  });

  it("lets exactly one of several simultaneous requests for a slot win", async () => {
    const customers = Array.from({ length: 6 }, (_, i) => ({
      ...sarah,
      email: `racer${i}@example.com`,
    }));
    const results = await Promise.all(customers.map((details) => book(at("12:00"), details)));

    expect(results.filter((result) => result.ok)).toHaveLength(1);
    expect(results.filter((result) => !result.ok)).toEqual(
      Array.from({ length: 5 }, () => ({ ok: false, reason: "slot-unavailable" })),
    );
    expect(await prisma.booking.count()).toBe(1);
  });

  it("reports an unknown or inactive service as not found", async () => {
    await prisma.service.update({ where: { id: serviceId }, data: { active: false } });
    expect(await book(at("09:00"))).toEqual({ ok: false, reason: "not-found" });
  });
});

describe("rescheduleBooking", () => {
  it("moves the booking, bumps its sequence and frees the old time", async () => {
    const created = await book(at("09:00"));
    if (!created.ok) throw new Error("setup failed");

    const moved = await rescheduleBooking({ bookingId: created.booking.id, startsAt: at("13:00"), now });
    expect(moved).toMatchObject({
      ok: true,
      previousStartsAt: at("09:00"),
      booking: { startsAt: at("13:00"), blockedUntil: at("14:15"), sequence: 1 },
    });
    expect((await book(at("09:00"), james)).ok).toBe(true);
  });

  it("can move into time overlapping its own current slot", async () => {
    const created = await book(at("09:00"));
    if (!created.ok) throw new Error("setup failed");
    const moved = await rescheduleBooking({ bookingId: created.booking.id, startsAt: at("09:30"), now });
    expect(moved.ok).toBe(true);
  });

  it("refuses to move onto someone else's booking", async () => {
    const mine = await book(at("09:00"));
    await book(at("11:00"), james);
    if (!mine.ok) throw new Error("setup failed");
    expect(await rescheduleBooking({ bookingId: mine.booking.id, startsAt: at("11:00"), now })).toEqual({
      ok: false,
      reason: "slot-unavailable",
    });
  });

  it("refuses to move a booking that has already started", async () => {
    const created = await book(at("09:00"));
    if (!created.ok) throw new Error("setup failed");
    const later = new Date("2030-06-03T09:30:00Z");
    expect(
      await rescheduleBooking({ bookingId: created.booking.id, startsAt: at("14:00"), now: later }),
    ).toEqual({ ok: false, reason: "not-changeable" });
  });
});

describe("cancelBooking", () => {
  it("cancels once, freeing the slot, and refuses further changes", async () => {
    const created = await book(at("09:00"));
    if (!created.ok) throw new Error("setup failed");
    const bookingId = created.booking.id;

    const cancelled = await cancelBooking({ bookingId, now });
    expect(cancelled).toMatchObject({ ok: true, booking: { status: "CANCELLED", sequence: 1 } });

    expect(await cancelBooking({ bookingId, now })).toEqual({ ok: false, reason: "not-changeable" });
    expect(await rescheduleBooking({ bookingId, startsAt: at("13:00"), now })).toEqual({
      ok: false,
      reason: "not-changeable",
    });
    expect((await book(at("09:00"), james)).ok).toBe(true);
  });

  it("reports a missing booking as not found", async () => {
    expect(await cancelBooking({ bookingId: "nope", now })).toEqual({ ok: false, reason: "not-found" });
  });
});
