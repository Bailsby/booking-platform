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
            <Link href="/" className="text-lg font-semibold tracking-tight">
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
            <div className="mx-auto max-w-3xl px-4 py-6 text-sm text-muted">
              {[business.name, business.address, business.email].filter(Boolean).join(" · ")}
            </div>
          </footer>
        )}
      </body>
    </html>
  );
}
