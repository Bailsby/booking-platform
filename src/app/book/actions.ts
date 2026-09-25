"use server";

import { redirect } from "next/navigation";
import { after } from "next/server";
import { managePath } from "@/lib/app-url";
import { createBooking } from "@/lib/bookings/bookings";
import { parseCustomerDetails, type DetailsField } from "@/lib/bookings/customer-details";
import { notifyCustomer } from "@/lib/bookings/notify";
import { instantParam } from "@/lib/search-params";

export type DetailsFormState = {
  errors?: Partial<Record<DetailsField, string>>;
  values?: Record<DetailsField, string>;
  /** The chosen time was taken, or is otherwise no longer bookable. */
  slotGone?: boolean;
};

export async function createBookingAction(
  _previous: DetailsFormState,
  form: FormData,
): Promise<DetailsFormState> {
  const serviceId = form.get("serviceId");
  const start = form.get("start");
  const startsAt = typeof start === "string" ? instantParam(start) : null;
  if (typeof serviceId !== "string" || !startsAt) return { slotGone: true };

  const parsed = parseCustomerDetails(form);
  if (!parsed.ok) return { errors: parsed.errors, values: parsed.values };

  const result = await createBooking({ serviceId, startsAt, details: parsed.details });
  if (!result.ok) {
    return { slotGone: true, values: { ...parsed.details, notes: parsed.details.notes ?? "" } };
  }

  // After the response, so the customer isn't kept waiting on the mail provider.
  after(() => notifyCustomer("confirmed", result.booking));
  redirect(`${managePath(result.booking.id)}&status=confirmed`);
}
