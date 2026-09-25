import Link from "next/link";
import type { LocalDate } from "@/lib/availability/local-date";
import type { DaySlots, Slot } from "@/lib/availability/slots";
import { formatLocalDate, formatTime } from "@/lib/format";

type SlotPickerProps = {
  days: DaySlots[];
  selectedDate: LocalDate | null;
  timeZone: string;
  dateHref: (date: LocalDate) => string;
  slotHref: (slot: Slot) => string;
  earlierHref: string | null;
  laterHref: string | null;
};

// Grouped by local hour, so a customer who wants "an afternoon" can find one fast.
const isMorning = (slot: Slot, timeZone: string) =>
  Number(formatTime(slot.startsAt, timeZone).slice(0, 2)) < 12;

/**
 * Pick a date from a fortnight's strip, then a time. Plain links throughout:
 * each choice is a URL, so the back button, sharing and refreshing all work,
 * and it needs no client-side JavaScript.
 */
export function SlotPicker({
  days,
  selectedDate,
  timeZone,
  dateHref,
  slotHref,
  earlierHref,
  laterHref,
}: SlotPickerProps) {
  const selected = days.find((day) => day.date === selectedDate);
  const groups = selected
    ? [
        { label: "Morning", slots: selected.slots.filter((slot) => isMorning(slot, timeZone)) },
        { label: "Afternoon", slots: selected.slots.filter((slot) => !isMorning(slot, timeZone)) },
      ].filter((group) => group.slots.length > 0)
    : [];

  const pager = "rounded-lg px-3 py-1.5 text-sm hover:bg-line/60";

  return (
    <section aria-label="Choose a date and time">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">Choose a date</h2>
        <nav className="flex gap-1" aria-label="Browse dates">
          {earlierHref ? (
            <Link href={earlierHref} className={pager}>
              ← Earlier
            </Link>
          ) : (
            <span className={`${pager} text-muted/50`}>← Earlier</span>
          )}
          {laterHref ? (
            <Link href={laterHref} className={pager}>
              Later →
            </Link>
          ) : (
            <span className={`${pager} text-muted/50`}>Later →</span>
          )}
        </nav>
      </div>

      <ol className="mt-3 grid grid-cols-4 gap-2 sm:grid-cols-7">
        {days.map((day) => {
          const available = day.slots.length > 0;
          const isSelected = day.date === selectedDate;
          const label = (
            <>
              <span className="text-xs uppercase tracking-wide">
                {formatLocalDate(day.date, { weekday: "short" })}
              </span>
              <span className="text-lg font-semibold leading-tight">
                {formatLocalDate(day.date, { day: "numeric" })}
              </span>
              <span className="text-xs">{formatLocalDate(day.date, { month: "short" })}</span>
            </>
          );
          const base = "flex flex-col items-center rounded-lg border py-2";
          return (
            <li key={day.date}>
              {available ? (
                <Link
                  href={dateHref(day.date)}
                  aria-current={isSelected ? "date" : undefined}
                  aria-label={`${formatLocalDate(day.date)}, ${day.slots.length} times available`}
                  scroll={false}
                  className={`${base} ${
                    isSelected
                      ? "border-brand bg-brand text-white"
                      : "border-line bg-surface hover:border-brand"
                  }`}
                >
                  {label}
                </Link>
              ) : (
                <span
                  aria-label={`${formatLocalDate(day.date)}, no times available`}
                  className={`${base} border-transparent text-muted/60 line-through decoration-muted/30`}
                >
                  {label}
                </span>
              )}
            </li>
          );
        })}
      </ol>

      <div className="mt-8">
        {selected ? (
          <>
            <h2 className="font-semibold">{formatLocalDate(selected.date)}</h2>
            {groups.map((group) => (
              <div key={group.label} className="mt-4">
                <h3 className="text-sm text-muted">{group.label}</h3>
                <ul className="mt-2 grid grid-cols-3 gap-2 sm:grid-cols-6">
                  {group.slots.map((slot) => (
                    <li key={slot.startsAt.toISOString()}>
                      <Link
                        href={slotHref(slot)}
                        className="block rounded-lg border border-line bg-surface py-2 text-center font-medium tabular-nums hover:border-brand hover:bg-brand-soft"
                      >
                        {formatTime(slot.startsAt, timeZone)}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </>
        ) : (
          <p className="rounded-lg bg-surface p-4 text-muted">
            No times available in these dates.{" "}
            {laterHref && (
              <Link href={laterHref} className="text-brand underline">
                Try later dates
              </Link>
            )}
          </p>
        )}
      </div>
    </section>
  );
}
