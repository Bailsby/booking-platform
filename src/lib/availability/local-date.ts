import { TZDate } from "@date-fns/tz";

/**
 * A calendar date in the business's zone, as `YYYY-MM-DD`. Deliberately a
 * string rather than a Date: a Date is an instant, and "Tuesday the 3rd" is
 * not one until a zone is applied.
 */
export type LocalDate = string;

const LOCAL_DATE = /^(\d{4})-(\d{2})-(\d{2})$/;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

const parse = (date: LocalDate): { year: number; month: number; day: number } => {
  const match = LOCAL_DATE.exec(date);
  const [year, month, day] = match ? match.slice(1).map(Number) : [];
  // Round-tripping through UTC rejects dates like 2026-02-30.
  if (!match || toUtcMidnight(year, month, day).toISOString().slice(0, 10) !== date) {
    throw new RangeError(`Not a valid local date: ${date}`);
  }
  return { year, month, day };
};

// Plain calendar arithmetic is done at UTC midnight, where no day is ever 23
// or 25 hours long.
const toUtcMidnight = (year: number, month: number, day: number): Date =>
  new Date(Date.UTC(year, month - 1, day));

const fromUtcMidnight = (date: Date): LocalDate => date.toISOString().slice(0, 10);

/** 0 = Sunday … 6 = Saturday. */
export const dayOfWeek = (date: LocalDate): number => {
  const { year, month, day } = parse(date);
  return toUtcMidnight(year, month, day).getUTCDay();
};

export const addDays = (date: LocalDate, days: number): LocalDate => {
  const { year, month, day } = parse(date);
  return fromUtcMidnight(new Date(toUtcMidnight(year, month, day).getTime() + days * MS_PER_DAY));
};

/** Every date from `from` to `to`, both inclusive. */
export const eachLocalDate = (from: LocalDate, to: LocalDate): LocalDate[] => {
  const start = parse(from);
  const end = parse(to);
  const count =
    (toUtcMidnight(end.year, end.month, end.day).getTime() -
      toUtcMidnight(start.year, start.month, start.day).getTime()) /
      MS_PER_DAY +
    1;
  return Array.from({ length: Math.max(count, 0) }, (_, i) => addDays(from, i));
};

/**
 * The instant at which it is `minute` minutes past midnight on `date` in
 * `timeZone`. Resolving each date's wall-clock time separately is what keeps a
 * 09:00 opening at 09:00 across a DST change. A time that doesn't exist (inside
 * the spring-forward gap) moves forward to the first one that does.
 */
export const localToInstant = (date: LocalDate, minute: number, timeZone: string): Date => {
  const { year, month, day } = parse(date);
  const local = new TZDate(year, month - 1, day, Math.floor(minute / 60), minute % 60, timeZone);
  return new Date(local.getTime());
};

/** The calendar date `instant` falls on in `timeZone`. */
export const localDateOf = (instant: Date, timeZone: string): LocalDate => {
  const local = new TZDate(instant.getTime(), timeZone);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}`;
};
