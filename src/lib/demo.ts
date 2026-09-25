/**
 * The public demo takes bookings from anyone, so it must never send email: a
 * visitor could type a stranger's address and have us mail them. In demo mode
 * nothing is sent, and the confirmation page shows the email instead.
 */
export const isDemo = (): boolean => process.env.DEMO_MODE === "true";
