import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { SlotPicker } from "@/components/slot-picker";
import { isLocalDate } from "@/lib/availability/local-date";
import { PICKER_DAYS, pickerRange } from "@/lib/availability/picker-range";
import { bookingWindow, getAvailability } from "@/lib/availability/queries";
import { findService } from "@/lib/business";
import { formatDuration, formatPrice } from "@/lib/format";
import { firstParam } from "@/lib/search-params";

export async function generateMetadata({ params }: PageProps<"/book/[serviceId]">): Promise<Metadata> {
  const found = await findService((await params).serviceId);
  return { title: found ? `Book a ${found.service.name}` : "Book" };
}

export default async function ChooseTime({ params, searchParams }: PageProps<"/book/[serviceId]">) {
  const found = await findService((await params).serviceId);
  if (!found) notFound();
  const { business, service } = found;

  const query = await searchParams;
  const range = pickerRange(bookingWindow(business), firstParam(query.from));
  const days = await getAvailability(service.id, { from: range.start, days: PICKER_DAYS });

  const requestedDate = firstParam(query.date);
  const selectedDate =
    isLocalDate(requestedDate) && days.some((day) => day.date === requestedDate && day.slots.length > 0)
      ? requestedDate
      : (days.find((day) => day.slots.length > 0)?.date ?? null);

  const base = `/book/${service.id}`;

  return (
    <main>
      <Link href="/" className="text-sm text-muted hover:text-ink">
        ← All services
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">{service.name}</h1>
      <p className="mt-1 text-muted">
        {formatDuration(service.durationMinutes)} · {formatPrice(service.price, business.currency)}
      </p>

      <div className="mt-8">
        <SlotPicker
          days={days}
          selectedDate={selectedDate}
          timeZone={business.timeZone}
          dateHref={(date) => `${base}?from=${range.start}&date=${date}`}
          slotHref={(slot) => `${base}/details?start=${encodeURIComponent(slot.startsAt.toISOString())}`}
          earlierHref={range.earlier && `${base}?from=${range.earlier}`}
          laterHref={range.later && `${base}?from=${range.later}`}
        />
      </div>
    </main>
  );
}
