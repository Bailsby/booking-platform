import type { Metadata } from "next";
import Link from "next/link";
import { BookingSummary } from "@/components/booking-summary";
import { reschedulePath } from "@/lib/app-url";
import { isChangeable } from "@/lib/bookings/bookings";
import { firstParam } from "@/lib/search-params";
import { cancelBookingAction } from "../actions";
import { loadBookingFromLink } from "./load";

export const metadata: Metadata = { title: "Your booking" };

const banners: Record<string, { tone: "good" | "bad"; title: string; body?: string }> = {
  confirmed: {
    tone: "good",
    title: "You're booked in",
    body: "We've emailed your confirmation, with a calendar invite. Keep it — its link brings you back here.",
  },
  rescheduled: { tone: "good", title: "Your booking has moved", body: "We've emailed you the new details." },
  cancelled: { tone: "good", title: "Your booking has been cancelled", body: "We've emailed you to confirm." },
  "not-changeable": {
    tone: "bad",
    title: "This booking can't be changed any more",
    body: "It has already been cancelled or has started. Please call us if you need a hand.",
  },
};

export default async function ManageBooking({ params, searchParams }: PageProps<"/bookings/[id]">) {
  const { booking, token, query } = await loadBookingFromLink(params, searchParams);
  const banner = banners[firstParam(query.status) ?? firstParam(query.error) ?? ""];
  const changeable = isChangeable(booking);
  const cancelled = booking.status === "CANCELLED";

  return (
    <main>
      {banner && (
        <div
          role="status"
          className={`mb-8 rounded-xl p-5 ${banner.tone === "good" ? "bg-brand-soft" : "bg-danger-soft"}`}
        >
          <p className="text-lg font-semibold">{banner.title}</p>
          {banner.body && <p className="mt-1 text-sm">{banner.body}</p>}
        </div>
      )}

      <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">
        {cancelled ? "Cancelled booking" : changeable ? "Your booking" : "Past appointment"}
      </h1>

      <div className={`mt-6 ${cancelled ? "opacity-60" : ""}`}>
        <BookingSummary booking={booking} />
      </div>

      {changeable && (
        <div className="mt-8 flex flex-col gap-4 sm:flex-row sm:items-start">
          <Link
            href={reschedulePath(booking.id)}
            className="rounded-lg bg-brand px-5 py-3 text-center font-semibold text-white hover:bg-brand-strong"
          >
            Change date or time
          </Link>

          {/* A disclosure rather than a single button: cancelling should take a
              deliberate second click, and this needs no JavaScript. */}
          <details className="group rounded-lg border border-line bg-surface open:p-4">
            <summary className="cursor-pointer list-none px-5 py-3 font-semibold text-danger group-open:p-0">
              Cancel booking
            </summary>
            <form action={cancelBookingAction} className="mt-3">
              <input type="hidden" name="bookingId" value={booking.id} />
              <input type="hidden" name="token" value={token} />
              <p className="text-sm">Are you sure? The slot will be offered to other customers.</p>
              <button
                type="submit"
                className="mt-3 rounded-lg bg-danger px-4 py-2 text-sm font-semibold text-white hover:opacity-90"
              >
                Yes, cancel it
              </button>
            </form>
          </details>
        </div>
      )}

      {(cancelled || !changeable) && (
        <Link href="/" className="mt-8 inline-block font-semibold text-brand underline">
          Book another appointment
        </Link>
      )}
    </main>
  );
}
