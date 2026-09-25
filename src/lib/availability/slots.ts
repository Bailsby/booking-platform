import { dayOfWeek, eachLocalDate, localToInstant, type LocalDate } from "./local-date";
import { mergeWindows, subtractWindow, type MinuteWindow } from "./windows";

export type WeeklyRule = { dayOfWeek: number; startMinute: number; endMinute: number };

export type DateException = {
  date: LocalDate;
  kind: "CLOSED" | "OPEN";
  startMinute: number | null;
  endMinute: number | null;
};

export type ServiceTiming = {
  durationMinutes: number;
  bufferBeforeMinutes: number;
  bufferAfterMinutes: number;
};

/** Time already taken by a booking, including that booking's buffers. */
export type BlockedRange = { from: Date; until: Date };

export type Slot = { startsAt: Date; endsAt: Date };
export type DaySlots = { date: LocalDate; slots: Slot[] };

export type SlotQuery = {
  timeZone: string;
  /** First and last dates to consider, both inclusive. */
  from: LocalDate;
  to: LocalDate;
  rules: readonly WeeklyRule[];
  exceptions: readonly DateException[];
  blocked: readonly BlockedRange[];
  service: ServiceTiming;
  slotIntervalMinutes: number;
  /** Nothing starting before this is offered — normally now plus the minimum notice. */
  earliestStart: Date;
};

const MS_PER_MINUTE = 60 * 1000;

const exceptionWindow = (exception: DateException): MinuteWindow | null =>
  exception.startMinute === null || exception.endMinute === null
    ? null
    : { start: exception.startMinute, end: exception.endMinute };

/**
 * The local opening windows for one date: the weekly rules for that weekday
 * plus any extra openings, minus any closures. A closure wins over an opening
 * on the same date.
 */
export const openWindowsOn = (
  date: LocalDate,
  rules: readonly WeeklyRule[],
  exceptions: readonly DateException[],
): MinuteWindow[] => {
  const weekday = dayOfWeek(date);
  const onDate = exceptions.filter((exception) => exception.date === date);
  const closures = onDate.filter((exception) => exception.kind === "CLOSED");

  if (closures.some((closure) => exceptionWindow(closure) === null)) return [];

  const opened = mergeWindows([
    ...rules
      .filter((rule) => rule.dayOfWeek === weekday)
      .map((rule) => ({ start: rule.startMinute, end: rule.endMinute })),
    ...onDate
      .filter((exception) => exception.kind === "OPEN")
      .flatMap((exception) => exceptionWindow(exception) ?? []),
  ]);

  return closures
    .flatMap((closure) => exceptionWindow(closure) ?? [])
    .reduce(subtractWindow, opened);
};

const overlaps = (a: BlockedRange, b: BlockedRange): boolean =>
  a.from < b.until && b.from < a.until;

/**
 * Every start time at which `service` can be booked, grouped by local date.
 *
 * The appointment itself must fit inside opening hours; its buffers need only
 * stay clear of other bookings' blocked time, so prep and clean-down may run
 * before opening or after closing.
 */
export const bookableSlots = (query: SlotQuery): DaySlots[] => {
  const { timeZone, service, slotIntervalMinutes, blocked, earliestStart } = query;
  if (!(slotIntervalMinutes > 0)) {
    throw new RangeError(`slotIntervalMinutes must be positive, got ${slotIntervalMinutes}`);
  }

  const durationMs = service.durationMinutes * MS_PER_MINUTE;
  const stepMs = slotIntervalMinutes * MS_PER_MINUTE;

  const isFree = (startsAt: Date, endsAt: Date): boolean => {
    const needed: BlockedRange = {
      from: new Date(startsAt.getTime() - service.bufferBeforeMinutes * MS_PER_MINUTE),
      until: new Date(endsAt.getTime() + service.bufferAfterMinutes * MS_PER_MINUTE),
    };
    return !blocked.some((range) => overlaps(needed, range));
  };

  // Candidates step through real elapsed time from each window's opening, so a
  // window that happens to span a DST change still yields evenly spaced slots.
  const slotsIn = (date: LocalDate, window: MinuteWindow): Slot[] => {
    const opens = localToInstant(date, window.start, timeZone).getTime();
    const closes = localToInstant(date, window.end, timeZone).getTime();
    const count = Math.floor((closes - opens - durationMs) / stepMs) + 1;
    return Array.from({ length: Math.max(count, 0) }, (_, i) => {
      const startsAt = new Date(opens + i * stepMs);
      return { startsAt, endsAt: new Date(startsAt.getTime() + durationMs) };
    }).filter(({ startsAt, endsAt }) => startsAt >= earliestStart && isFree(startsAt, endsAt));
  };

  return eachLocalDate(query.from, query.to).map((date) => ({
    date,
    slots: openWindowsOn(date, query.rules, query.exceptions).flatMap((window) =>
      slotsIn(date, window),
    ),
  }));
};
