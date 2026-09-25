import { addDays, isLocalDate, type LocalDate } from "./local-date";

export const PICKER_DAYS = 14;

const MS_PER_DAY = 24 * 60 * 60 * 1000;

/**
 * The `from` of the fortnight page containing `date`, so a "change time" link
 * lands on the same page of dates the customer picked from.
 */
export const pageStartFor = (window: { first: LocalDate }, date: LocalDate): LocalDate => {
  const daysIn = Math.round((Date.parse(date) - Date.parse(window.first)) / MS_PER_DAY);
  return daysIn <= 0 ? window.first : addDays(window.first, daysIn - (daysIn % PICKER_DAYS));
};

/**
 * Which fortnight of the booking window to show, from an untrusted `from`
 * parameter, and where the earlier and later links lead (null at either end).
 */
export const pickerRange = (
  window: { first: LocalDate; last: LocalDate },
  requested: unknown,
): { start: LocalDate; earlier: LocalDate | null; later: LocalDate | null } => {
  const start =
    isLocalDate(requested) && requested > window.first && requested <= window.last
      ? requested
      : window.first;

  const previous = addDays(start, -PICKER_DAYS);
  const next = addDays(start, PICKER_DAYS);

  return {
    start,
    earlier: start > window.first ? (previous > window.first ? previous : window.first) : null,
    later: next <= window.last ? next : null,
  };
};
