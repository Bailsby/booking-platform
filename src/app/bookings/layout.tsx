import type { Metadata } from "next";

// Every page under here is reached through a private link carrying a token.
// Keep it out of search results, and out of the Referer header sent to any
// site the customer follows a link to.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default function BookingsLayout({ children }: LayoutProps<"/bookings">) {
  return children;
}
