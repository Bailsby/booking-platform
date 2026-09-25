import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { SlotPicker } from "@/components/slot-picker";
import { isLocalDate } from "@/lib/availability/local-date";
import { PICKER_DAYS, pickerRange } from "@/lib/availability/picker-range";
import { bookingWindow, getAvailability } from "@/lib/availability/queries";
import { managePath, reschedulePath } from "@/lib/app-url";
import { isChangeable } from "@/lib/bookings/bookings";
import { formatAppointment } from "@/lib/format";
import { firstParam } from "@/lib/search-params";
import { loadBookingFromLink } from "../load";

export const metadata: Metadata = { title: "Change your booking" };

export default async function Reschedule({ params, searchParams }: PageProps<"/bookings/[id]/reschedule">) {
  const { booking, token, query } = await loadBookingFromLink(params, searchParams);
  if (!isChangeable(booking)) redirect(`${managePath(booking.id)}&error=not-changeable`);

  const { business, service } = booking;
  const range = pickerRange(bookingWindow(business), firstParam(query.from));
  // The booking's own time counts as free: moving 30 minutes later shouldn't
  // be blocked by the appointment being moved.
  const days = await getAvailability(service.id, {
    from: range.start,
    days: PICKER_DAYS,
    ignoreBookingId: booking.id,
  });

  const requestedDate = firstParam(query.date);
  const selectedDate =
    isLocalDate(requestedDate) && days.some((day) => day.date === requestedDate && day.slots.length > 0)
      ? requestedDate
      : (days.find((day) => day.slots.length > 0)?.date ?? null);

  const base = reschedulePath(booking.id);
  const confirmBase = `/bookings/${booking.id}/reschedule/confirm?token=${token}`;

  return (
    <main>
      <Link href={managePath(booking.id)} className="text-sm text-muted hover:text-ink">
        ← Back to your booking
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Choose a new time</h1>
      <p className="mt-1 text-muted">
        {service.name}, currently {formatAppointment(booking.startsAt, business.timeZone)}.
      </p>

      {firstParam(query.error) === "slot-unavailable" && (
        <p role="alert" className="mt-6 rounded-lg bg-danger-soft p-4 text-sm font-medium">
          Sorry — that time has just been taken. Please choose another.
        </p>
      )}

      <div className="mt-8">
        <SlotPicker
          days={days}
          selectedDate={selectedDate}
          timeZone={business.timeZone}
          dateHref={(date) => `${base}&from=${range.start}&date=${date}`}
          slotHref={(slot) => `${confirmBase}&start=${encodeURIComponent(slot.startsAt.toISOString())}`}
          earlierHref={range.earlier && `${base}&from=${range.earlier}`}
          laterHref={range.later && `${base}&from=${range.later}`}
        />
      </div>
    </main>
  );
}
