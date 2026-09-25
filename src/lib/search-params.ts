type Param = string | string[] | undefined;

/** A repeated query parameter (`?a=1&a=2`) is treated as its first value. */
export const firstParam = (value: Param): string | undefined =>
  Array.isArray(value) ? value[0] : value;

/** An ISO instant from a URL, or null if it isn't one. */
export const instantParam = (value: Param): Date | null => {
  const raw = firstParam(value);
  if (!raw) return null;
  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
};
