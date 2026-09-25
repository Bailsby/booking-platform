import { notFound } from "next/navigation";
import { findBooking } from "@/lib/bookings/bookings";
import { isValidManageToken } from "@/lib/bookings/manage-token";
import { firstParam } from "@/lib/search-params";

/**
 * The booking a manage-link page is for, or a 404. An invalid token and a
 * missing booking look the same, so a link can't be used to probe which
 * booking ids exist.
 */
export const loadBookingFromLink = async (
  params: Promise<{ id: string }>,
  searchParams: Promise<Record<string, string | string[] | undefined>>,
) => {
  const { id } = await params;
  const query = await searchParams;
  const token = firstParam(query.token);
  if (!token || !isValidManageToken(id, token)) notFound();

  const booking = await findBooking(id);
  if (!booking) notFound();
  return { booking, token, query };
};
