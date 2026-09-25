import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getAvailability } from "@/lib/availability/queries";

// A read-only view of the availability engine against the seeded business.
// The real booking flow (choose, pick, pay, confirm) replaces this in phase 2.

const DAYS_SHOWN = 14;

const formatPrice = (minor: number, currency: string) =>
  new Intl.NumberFormat("en-GB", { style: "currency", currency }).format(minor / 100);

export default async function Home({ searchParams }: PageProps<"/">) {
  const business = await prisma.business.findFirst({
    include: { services: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
  });

  if (!business) {
    return (
      <main className="mx-auto max-w-2xl px-4 py-16">
        <p>
          No business yet — run <code className="font-mono">npm run seed</code>.
        </p>
      </main>
    );
  }

  const { service: requested } = await searchParams;
  const selected =
    business.services.find((service) => service.id === requested) ?? business.services[0];
  const days = await getAvailability(selected.id, DAYS_SHOWN);

  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: business.timeZone,
    hour: "2-digit",
    minute: "2-digit",
  });
  const dayLabel = new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    weekday: "short",
    day: "numeric",
    month: "short",
  });

  return (
    <main className="mx-auto w-full max-w-3xl px-4 py-10">
      <h1 className="text-3xl font-semibold tracking-tight">{business.name}</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Availability preview · times shown in {business.timeZone}
      </p>

      <nav className="mt-8 flex flex-wrap gap-2" aria-label="Services">
        {business.services.map((service) => (
          <Link
            key={service.id}
            href={`/?service=${service.id}`}
            aria-current={service.id === selected.id ? "page" : undefined}
            className="rounded-full border border-zinc-300 px-4 py-2 text-sm hover:border-zinc-500 aria-[current=page]:border-teal-700 aria-[current=page]:bg-teal-700 aria-[current=page]:text-white dark:border-zinc-700"
          >
            {service.name}
          </Link>
        ))}
      </nav>

      <p className="mt-4 text-sm text-zinc-600 dark:text-zinc-400">
        {selected.description} {selected.durationMinutes} min ·{" "}
        {formatPrice(selected.price, business.currency)}
      </p>

      <ol className="mt-8 space-y-6">
        {days.map((day) => (
          <li key={day.date}>
            <h2 className="text-sm font-medium">
              {dayLabel.format(new Date(`${day.date}T00:00:00Z`))}
            </h2>
            {day.slots.length === 0 ? (
              <p className="mt-2 text-sm text-zinc-400">No availability</p>
            ) : (
              <ul className="mt-2 flex flex-wrap gap-2">
                {day.slots.map((slot) => (
                  <li
                    key={slot.startsAt.toISOString()}
                    className="rounded-md bg-zinc-100 px-2.5 py-1 font-mono text-sm tabular-nums dark:bg-zinc-800"
                  >
                    {time.format(slot.startsAt)}
                  </li>
                ))}
              </ul>
            )}
          </li>
        ))}
      </ol>
    </main>
  );
}
