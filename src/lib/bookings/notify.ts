import { appUrl, manageUrl } from "@/lib/app-url";
import { bookingEmail, type BookingEmailKind } from "@/lib/email/booking-emails";
import { sendEmail } from "@/lib/email/send";
import type { FullBooking } from "./bookings";

// AUTH_EMAIL_FROM may be `Name <address>`; the calendar organiser needs the bare address.
const senderAddress = (): string => {
  const from = process.env.AUTH_EMAIL_FROM ?? "";
  return /<([^>]+)>/.exec(from)?.[1] ?? (from || "bookings@localhost");
};

/**
 * Emails the customer about a change to their booking. Never throws: by the
 * time this runs the booking is already saved, and a mail outage shouldn't
 * turn a successful booking into an error page. The manage page shows the same
 * details, so a lost email is recoverable.
 */
export const notifyCustomer = async (
  kind: BookingEmailKind,
  booking: FullBooking,
  previousStartsAt?: Date,
): Promise<void> => {
  try {
    await sendEmail(
      bookingEmail({
        kind,
        bookingId: booking.id,
        sequence: booking.sequence,
        business: booking.business,
        service: booking.service,
        customer: booking.customer,
        startsAt: booking.startsAt,
        endsAt: booking.endsAt,
        previousStartsAt,
        notes: booking.notes,
        manageUrl: manageUrl(booking.id),
        siteUrl: appUrl(),
        fallbackOrganizerEmail: senderAddress(),
        now: new Date(),
      }),
    );
  } catch (error) {
    console.error(`Failed to send ${kind} email for booking ${booking.id}`, error);
  }
};
