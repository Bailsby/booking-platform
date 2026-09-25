import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { localDateOf } from "@/lib/availability/local-date";
import { pageStartFor } from "@/lib/availability/picker-range";
import { bookingWindow, isSlotOffered } from "@/lib/availability/queries";
import { findService } from "@/lib/business";
import { formatAppointment, formatDuration, formatPrice } from "@/lib/format";
import { instantParam } from "@/lib/search-params";
import { DetailsForm } from "./details-form";

export const metadata: Metadata = { title: "Your details" };

export default async function Details({ params, searchParams }: PageProps<"/book/[serviceId]/details">) {
  const found = await findService((await params).serviceId);
  if (!found) notFound();
  const { business, service } = found;

  const startsAt = instantParam((await searchParams).start);
  const offered = startsAt ? await isSlotOffered(service.id, startsAt) : false;

  const date = startsAt ? localDateOf(startsAt, business.timeZone) : null;
  const pickerHref = date
    ? `/book/${service.id}?from=${pageStartFor(bookingWindow(business), date)}&date=${date}`
    : `/book/${service.id}`;

  if (!startsAt || !offered) {
    return (
      <main>
        <h1 className="text-2xl font-semibold tracking-tight">That time isn&apos;t available</h1>
        <p className="mt-2 text-muted">
          Someone may have just booked it. There are plenty of other times to choose from.
        </p>
        <Link
          href={pickerHref}
          className="mt-6 inline-block rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-strong"
        >
          Choose another time
        </Link>
      </main>
    );
  }

  return (
    <main>
      <Link href={pickerHref} className="text-sm text-muted hover:text-ink">
        ← Change time
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Your details</h1>

      <dl className="mt-6 grid gap-x-6 gap-y-2 rounded-xl border border-line bg-surface p-5 sm:grid-cols-[auto_1fr]">
        <dt className="text-sm text-muted">Appointment</dt>
        <dd className="font-medium">{service.name}</dd>
        <dt className="text-sm text-muted">When</dt>
        <dd className="font-medium">{formatAppointment(startsAt, business.timeZone)}</dd>
        <dt className="text-sm text-muted">Length</dt>
        <dd>{formatDuration(service.durationMinutes)}</dd>
        <dt className="text-sm text-muted">Price</dt>
        <dd>{formatPrice(service.price, business.currency)}, paid at the salon</dd>
      </dl>

      <div className="mt-8">
        <DetailsForm serviceId={service.id} start={startsAt.toISOString()} pickerHref={pickerHref} />
      </div>
    </main>
  );
}
