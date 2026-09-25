import { createHmac, timingSafeEqual } from "node:crypto";

// Customers have no accounts, so the link in their confirmation email is their
// only way back to a booking. It carries an HMAC of the booking id rather than a
// stored token: nothing to look up, and nothing to leak from the database.
//
// It deliberately doesn't expire. It has to work right up to the appointment,
// and what it permits is already bounded by the booking's own state — once an
// appointment has passed or been cancelled there is nothing left to change.

const PURPOSE = "manage-booking";

const signingKey = (): string => {
  const key = process.env.AUTH_SECRET;
  if (!key) throw new Error("AUTH_SECRET is not set");
  return key;
};

export const manageToken = (bookingId: string, key: string = signingKey()): string =>
  createHmac("sha256", key).update(`${PURPOSE}:${bookingId}`).digest("base64url");

export const isValidManageToken = (
  bookingId: string,
  token: unknown,
  key: string = signingKey(),
): boolean => {
  if (typeof token !== "string") return false;
  const expected = Buffer.from(manageToken(bookingId, key));
  const given = Buffer.from(token);
  return given.length === expected.length && timingSafeEqual(given, expected);
};
