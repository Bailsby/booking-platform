import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { getBusiness } from "@/lib/business";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata(): Promise<Metadata> {
  const business = await getBusiness();
  const name = business?.name ?? "Book online";
  return {
    title: { default: `${name} — Book online`, template: `%s · ${name}` },
    description: `Book an appointment with ${name} online.`,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const business = await getBusiness();

  return (
    <html lang="en-GB" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="flex min-h-full flex-col font-sans">
        <header className="border-b border-line bg-surface">
          <div className="mx-auto flex max-w-3xl items-center justify-between px-4 py-4">
            <Link href="/" className="flex items-center gap-2 text-lg font-semibold tracking-tight hover:text-brand">
              <svg
                aria-hidden="true"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
                className="size-5 text-brand"
              >
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5 9v11a1 1 0 0 0 1 1h4v-6h4v6h4a1 1 0 0 0 1-1V9" />
              </svg>
              {business?.name ?? "Book online"}
            </Link>
            {business?.phone && (
              <a href={`tel:${business.phone.replace(/\s/g, "")}`} className="text-sm text-muted hover:text-ink">
                {business.phone}
              </a>
            )}
          </div>
        </header>

        <div className="mx-auto w-full max-w-3xl flex-1 px-4 py-8 sm:py-12">{children}</div>

        {business && (
          <footer className="border-t border-line">
            <div className="mx-auto max-w-3xl px-4 py-6 text-center text-sm text-muted">
              {[business.name, business.address, business.email].filter(Boolean).join(" · ")}
            </div>
          </footer>
        )}
      </body>
    </html>
  );
}
