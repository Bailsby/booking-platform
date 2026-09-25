import Link from "next/link";
import { getBusiness } from "@/lib/business";
import { formatDuration, formatPrice } from "@/lib/format";

export default async function Home() {
  const business = await getBusiness();

  if (!business) {
    return (
      <p>
        No business set up yet — run <code className="font-mono">npm run seed</code>.
      </p>
    );
  }

  return (
    <main>
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Book an appointment</h1>
      <p className="mt-2 text-muted">
        Choose a service to see available times. No account needed — it takes about a minute.
      </p>

      <ul className="mt-8 grid gap-3">
        {business.services.map((service) => (
          <li key={service.id}>
            <Link
              href={`/book/${service.id}`}
              className="group flex items-center justify-between gap-4 rounded-xl border border-line bg-surface p-5 transition hover:border-brand focus-visible:outline-2 focus-visible:outline-brand"
            >
              <div>
                <h2 className="font-semibold">{service.name}</h2>
                {service.description && <p className="mt-1 text-sm text-muted">{service.description}</p>}
                <p className="mt-2 text-sm">
                  {formatDuration(service.durationMinutes)} · {formatPrice(service.price, business.currency)}
                </p>
              </div>
              <span className="shrink-0 rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white group-hover:bg-brand-strong">
                Book
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
