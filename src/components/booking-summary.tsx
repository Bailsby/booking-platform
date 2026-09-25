import type { FullBooking } from "@/lib/bookings/bookings";
import { formatAppointment, formatDuration, formatPrice } from "@/lib/format";

export function BookingSummary({ booking }: { booking: FullBooking }) {
  const { business, service, customer } = booking;
  const rows: [string, string][] = [
    ["Appointment", service.name],
    ["When", formatAppointment(booking.startsAt, business.timeZone)],
    ["Length", formatDuration(service.durationMinutes)],
    ["Price", `${formatPrice(service.price, business.currency)}, paid at the salon`],
    ...(business.address ? ([["Where", `${business.name}, ${business.address}`]] as [string, string][]) : []),
    ["Name", customer.name],
    ...(booking.notes ? ([["Notes", booking.notes]] as [string, string][]) : []),
  ];

  return (
    <dl className="grid gap-x-6 gap-y-2 rounded-xl border border-line bg-surface p-5 sm:grid-cols-[auto_1fr]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-sm text-muted">{label}</dt>
          <dd className="font-medium">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
