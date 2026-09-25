// Postgres raises exclusion_violation (23P01) when the Booking_no_overlap
// constraint rejects a write. Prisma 7's pg adapter doesn't map it to a
// dedicated error code; it surfaces the driver error under meta.

const EXCLUSION_VIOLATION = "23P01";

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null;

const at = (value: unknown, ...path: string[]): unknown =>
  path.reduce<unknown>((node, key) => (isRecord(node) ? node[key] : undefined), value);

/** True when a write failed because the time overlaps another booking. */
export const isOverlapError = (error: unknown): boolean =>
  at(error, "meta", "driverAdapterError", "cause", "originalCode") === EXCLUSION_VIOLATION ||
  // Raw queries and other paths report the driver's code directly.
  at(error, "cause", "originalCode") === EXCLUSION_VIOLATION;
