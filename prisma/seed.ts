// Demo data: a small dog grooming salon in Leeds with three weeks of history and
// three weeks of upcoming bookings, all relative to today so the demo never
// looks stale. Re-running replaces everything.

import type { Prisma } from "../src/generated/prisma/client";
import { prisma } from "../src/lib/prisma";
import { addDays, localDateOf, eachLocalDate } from "../src/lib/availability/local-date";
import { bookableSlots, type BlockedRange, type WeeklyRule } from "../src/lib/availability/slots";

const TIME_ZONE = "Europe/London";
const hm = (hours: number, minutes = 0) => hours * 60 + minutes;

// Seeded so every run produces the same shape of diary.
const random = (() => {
  let state = 20260925;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
})();
const pick = <T>(items: readonly T[]): T => items[Math.floor(random() * items.length)];

const services = [
  { name: "Nail Trim", description: "Clip, file and a paw-pad tidy. Walk-in quick.", durationMinutes: 15, bufferAfterMinutes: 5, price: 1200, weight: 3 },
  { name: "Puppy Introduction", description: "A gentle first visit for pups under six months: bath, brush and lots of treats.", durationMinutes: 30, bufferAfterMinutes: 10, price: 2500, weight: 1 },
  { name: "Bath & Brush", description: "Shampoo, condition, blow-dry and brush-out, with ears cleaned and nails trimmed.", durationMinutes: 45, bufferAfterMinutes: 15, price: 3500, weight: 3 },
  { name: "Full Groom — Small Dog", description: "Bath, dry and a full breed-standard or pet trim. Up to 10kg.", durationMinutes: 75, bufferAfterMinutes: 15, price: 4500, weight: 4 },
  { name: "Full Groom — Large Dog", description: "Bath, dry and a full trim for dogs over 10kg. Doodles welcome.", durationMinutes: 90, bufferAfterMinutes: 15, price: 6000, weight: 3 },
];

// Tuesday to Friday with a lunch break, and a busy Saturday morning.
const rules: WeeklyRule[] = [
  ...[2, 3, 4, 5].flatMap((dayOfWeek) => [
    { dayOfWeek, startMinute: hm(9), endMinute: hm(12, 30) },
    { dayOfWeek, startMinute: hm(13, 30), endMinute: hm(17) },
  ]),
  { dayOfWeek: 6, startMinute: hm(8, 30), endMinute: hm(14) },
];

const customers = [
  ["Sarah Whitfield", "Biscuit, cockapoo, 3. Nervous of the dryer — towel dry where possible."],
  ["James Okafor", "Luna, border collie. Pulls away from nail clippers."],
  ["Priya Sharma", "Mochi, shih tzu, 7. Teddy bear face, short body."],
  ["Tom Hargreaves", "Bramble, springer spaniel. Usually muddy on arrival."],
  ["Emma Clarke", "Pickle, dachshund. Sensitive back — no lifting from the middle."],
  ["Daniel Moss", "Otis, labradoodle, 2. Full clip, 1 inch all over."],
  ["Hannah Lee", "Bear, Bernese mountain dog. Heavy shedder, de-shed treatment."],
  ["Mohammed Akhtar", "Coco, toy poodle. Pom-pom tail, owner is particular about the topknot."],
  ["Rachel Dunn", "Winston, bulldog. Clean facial folds carefully."],
  ["Chris Walker", "Maple & Pip, two westies — book back to back."],
  ["Laura Bennett", "Rolo, chocolate lab puppy, 4 months."],
  ["Ben Foster", "Ziggy, whippet. Feels the cold, dry quickly."],
  ["Aisha Patel", "Nala, golden retriever. Loves everyone."],
  ["Gemma Ryan", "Teddy, cavapoo, 5. Nibbles when feet are handled."],
  ["Oliver Grant", "Stanley, schnauzer. Hand-strip the back, clip the legs."],
].map(([name, notes], i) => ({
  name,
  notes,
  email: `${name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
  phone: `07700 900${String(100 + i * 37).padStart(3, "0")}`,
}));

const main = async () => {
  await prisma.$transaction([
    prisma.booking.deleteMany(),
    prisma.customer.deleteMany(),
    prisma.availabilityException.deleteMany(),
    prisma.availabilityRule.deleteMany(),
    prisma.service.deleteMany(),
    prisma.business.deleteMany(),
  ]);

  const business = await prisma.business.create({
    data: {
      name: "Muddy Paws Grooming",
      timeZone: TIME_ZONE,
      rules: { create: rules },
      services: {
        create: services.map(({ name, description, durationMinutes, bufferAfterMinutes, price }, sortOrder) => ({
          name,
          description,
          durationMinutes,
          bufferAfterMinutes,
          price,
          sortOrder,
        })),
      },
      customers: { create: customers.map(({ name, email, phone }) => ({ name, email, phone })) },
    },
    include: { services: true, customers: true },
  });

  const today = localDateOf(new Date(), TIME_ZONE);
  const exceptions = [
    { date: addDays(today, 12), kind: "CLOSED" as const, startMinute: null, endMinute: null, reason: "Grooming trade show" },
    { date: addDays(today, 5), kind: "CLOSED" as const, startMinute: hm(14), endMinute: hm(17), reason: "Van MOT" },
  ];
  await prisma.availabilityException.createMany({
    data: exceptions.map((exception) => ({
      ...exception,
      businessId: business.id,
      date: new Date(`${exception.date}T00:00:00Z`),
    })),
  });

  const customerIds = new Map(business.customers.map((c) => [c.email, c.id]));

  // Weighted so full grooms dominate, as they do in a real salon's diary.
  const weightedServices = business.services.flatMap((service) =>
    Array.from({ length: services.find((s) => s.name === service.name)?.weight ?? 1 }, () => service),
  );

  // Fill each day by repeatedly asking the engine for a free slot, so the demo
  // data can never violate the no-overlap constraint. Past days are busy; the
  // coming days thin out, leaving a prospect plenty of slots to click.
  const bookings = eachLocalDate(addDays(today, -21), addDays(today, 21)).flatMap((date) => {
    const daysAhead = Math.round((Date.parse(date) - Date.parse(today)) / 86_400_000);
    const base = daysAhead < 0 ? 5 : daysAhead < 7 ? 2 : daysAhead < 14 ? 1 : 0;
    const attempts = Math.round(base + random() * 2);

    return Array.from({ length: attempts }).reduce<{ blocked: BlockedRange[]; made: Prisma.BookingCreateManyInput[] }>(
      (day) => {
        const service = pick(weightedServices);
        const [{ slots }] = bookableSlots({
          timeZone: TIME_ZONE,
          from: date,
          to: date,
          rules,
          exceptions,
          blocked: day.blocked,
          service,
          slotIntervalMinutes: 15,
          earliestStart: new Date(0),
        });
        if (slots.length === 0) return day;

        // Biased towards the earliest free slot, as real diaries fill: picking
        // uniformly scatters bookings and leaves only gaps too short to use.
        const slot = slots[Math.floor(random() ** 3 * slots.length)];
        const customer = pick(customers);
        const blockedFrom = new Date(slot.startsAt.getTime() - service.bufferBeforeMinutes * 60_000);
        const blockedUntil = new Date(slot.endsAt.getTime() + service.bufferAfterMinutes * 60_000);
        const cancelled = random() < 0.06;

        return {
          // A cancelled booking frees its time, so it doesn't block later picks.
          blocked: cancelled ? day.blocked : [...day.blocked, { from: blockedFrom, until: blockedUntil }],
          made: [
            ...day.made,
            {
              businessId: business.id,
              serviceId: service.id,
              customerId: customerIds.get(customer.email) ?? "",
              status: cancelled ? "CANCELLED" : "CONFIRMED",
              startsAt: slot.startsAt,
              endsAt: slot.endsAt,
              blockedFrom,
              blockedUntil,
              notes: customer.notes,
            },
          ],
        };
      },
      { blocked: [], made: [] },
    ).made;
  });

  await prisma.booking.createMany({ data: bookings });

  console.log(
    `Seeded ${business.name}: ${business.services.length} services, ${customers.length} customers, ${bookings.length} bookings.`,
  );
};

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
