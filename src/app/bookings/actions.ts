"use server";

import { notFound, redirect } from "next/navigation";
import { after } from "next/server";
import { managePath, reschedulePath } from "@/lib/app-url";
import { cancelBooking, rescheduleBooking } from "@/lib/bookings/bookings";
import { isValidManageToken } from "@/lib/bookings/manage-token";
import { notifyCustomer } from "@/lib/bookings/notify";
import { instantParam } from "@/lib/search-params";

// Server actions are reachable by a direct POST, so each one checks the
// signed token itself rather than trusting that the page it came from did.
const authorisedBookingId = (form: FormData): string => {
  const bookingId = form.get("bookingId");
  if (typeof bookingId !== "string" || !isValidManageToken(bookingId, form.get("token"))) notFound();
  return bookingId;
};

export async function cancelBookingAction(form: FormData) {
  const bookingId = authorisedBookingId(form);

  const result = await cancelBooking({ bookingId });
  if (!result.ok) redirect(`${managePath(bookingId)}&error=${result.reason}`);

  after(() => notifyCustomer("cancelled", result.booking));
  redirect(`${managePath(bookingId)}&status=cancelled`);
}

export async function rescheduleBookingAction(form: FormData) {
  const bookingId = authorisedBookingId(form);
  const start = form.get("start");
  const startsAt = typeof start === "string" ? instantParam(start) : null;
  if (!startsAt) redirect(`${reschedulePath(bookingId)}&error=slot-unavailable`);

  const result = await rescheduleBooking({ bookingId, startsAt });
  if (!result.ok) {
    redirect(
      result.reason === "slot-unavailable"
        ? `${reschedulePath(bookingId)}&error=slot-unavailable`
        : `${managePath(bookingId)}&error=${result.reason}`,
    );
  }

  after(() => notifyCustomer("rescheduled", result.booking, result.previousStartsAt));
  // The old time is only used to word the demo's email preview.
  const previous = encodeURIComponent(result.previousStartsAt.toISOString());
  redirect(`${managePath(bookingId)}&status=rescheduled&previous=${previous}`);
}
