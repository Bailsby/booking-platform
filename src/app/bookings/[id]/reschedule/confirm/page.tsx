import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { localDateOf } from "@/lib/availability/local-date";
import { pageStartFor } from "@/lib/availability/picker-range";
import { bookingWindow, isSlotOffered } from "@/lib/availability/queries";
import { managePath, reschedulePath } from "@/lib/app-url";
import { isChangeable } from "@/lib/bookings/bookings";
import { formatAppointment } from "@/lib/format";
import { instantParam } from "@/lib/search-params";
import { rescheduleBookingAction } from "../../../actions";
import { loadBookingFromLink } from "../../load";

export const metadata: Metadata = { title: "Confirm new time" };

export default async function ConfirmReschedule({
  params,
  searchParams,
}: PageProps<"/bookings/[id]/reschedule/confirm">) {
  const { booking, token, query } = await loadBookingFromLink(params, searchParams);
  if (!isChangeable(booking)) redirect(`${managePath(booking.id)}&error=not-changeable`);

  const { business, service } = booking;
  const startsAt = instantParam(query.start);
  const offered =
    startsAt && (await isSlotOffered(service.id, startsAt, { ignoreBookingId: booking.id }));
  if (!startsAt || !offered) redirect(`${reschedulePath(booking.id)}&error=slot-unavailable`);

  const date = localDateOf(startsAt, business.timeZone);
  const pickerHref = `${reschedulePath(booking.id)}&from=${pageStartFor(bookingWindow(business), date)}&date=${date}`;

  return (
    <main>
      <Link href={pickerHref} className="text-sm text-muted hover:text-ink">
        ← Pick a different time
      </Link>
      <h1 className="mt-3 text-2xl font-semibold tracking-tight sm:text-3xl">Move your {service.name}?</h1>

      <dl className="mt-6 grid gap-x-6 gap-y-2 rounded-xl border border-line bg-surface p-5 sm:grid-cols-[auto_1fr]">
        <dt className="text-sm text-muted">From</dt>
        <dd className="text-muted line-through">{formatAppointment(booking.startsAt, business.timeZone)}</dd>
        <dt className="text-sm text-muted">To</dt>
        <dd className="font-semibold">{formatAppointment(startsAt, business.timeZone)}</dd>
      </dl>

      <form action={rescheduleBookingAction} className="mt-8">
        <input type="hidden" name="bookingId" value={booking.id} />
        <input type="hidden" name="token" value={token} />
        <input type="hidden" name="start" value={startsAt.toISOString()} />
        <button
          type="submit"
          className="rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-strong"
        >
          Confirm new time
        </button>
      </form>
    </main>
  );
}
