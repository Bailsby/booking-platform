import { manageToken } from "./bookings/manage-token";

/** The public origin, for links that leave the app — in emails, say. */
export const appUrl = (): string =>
  (
    process.env.APP_URL ??
    // Set automatically on Vercel; covers deployments where APP_URL is forgotten.
    (process.env.VERCEL_PROJECT_PRODUCTION_URL
      ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
      : "http://localhost:3000")
  ).replace(/\/$/, "");

export const managePath = (bookingId: string): string =>
  `/bookings/${bookingId}?token=${manageToken(bookingId)}`;

export const manageUrl = (bookingId: string): string => `${appUrl()}${managePath(bookingId)}`;
