# Online booking for a dog grooming salon

**[Try the live demo →](https://dog-groomers.jake-bailey.dev)**. No sign-up. The salon
is fictional, nothing you do sends an email, and the diary resets every night.

## The problem

A small salon takes bookings by phone, text and Facebook message, usually while it has a
dog on the table. Calls go unanswered, bookings get written in the wrong slot, and
no-shows cost a morning's income. Off-the-shelf booking apps help, but they charge monthly
per staff member and treat every service as the same fixed-length block. That doesn't work
when a nail trim takes 15 minutes and a large-dog groom takes 90.

## What it does

Customers book online in about a minute, from their phone, without creating an account:

1. **Choose a service.** Each service has its own length, price and clean-down time.
2. **Pick a date and time.** Only genuinely free times are shown. They take account of
   opening hours, lunch breaks, holidays, other bookings and the time needed between dogs.
3. **Enter their details:** name, email, phone, and a note about the dog.
4. **Get a confirmation** by email with a calendar invite. The email includes a private
   link for rescheduling or cancelling later, with no phone call and no password.

When a booking moves or is cancelled, the customer's calendar updates itself.

### Things it gets right

- **No double bookings, ever.** If two people pick the same slot in the same second, one
  gets it and the other is politely asked to choose again. The database enforces this,
  so it can't be defeated by a network race or a bug somewhere else.
- **Clocks going forward or back don't break anything.** A 9am appointment stays 9am on
  the day the clocks change. This is the most common way booking systems quietly send
  someone to a closed door.
- **Cancellation links are safe.** Just opening a link never changes a booking. Email
  apps that preview links, and people who tap one by mistake, can't cancel an
  appointment. A tampered link is simply rejected.

## Coming next

- **Deposits and pre-payment** through Stripe, set per service, with automatic refunds
  within a cancellation window. This is what stops no-shows.
- **The salon's side:** a day, week and month calendar, adding phone bookings by hand,
  each customer's history, reminder emails the day before, and bookings appearing in
  Google Calendar.

## How it's built

For the technically curious:

- **Opening hours are stored as rules, not slots.** "Tuesdays, 9 to 5, lunch at 12:30"
  plus one-off changes ("closed on the 12th"). Free times are calculated when someone
  looks, so changing opening hours never means rewriting a table of future slots.
- **Times are stored in UTC and shown in the salon's own time zone.** Each date's
  opening hours are resolved in that zone, which is what keeps a 9am opening at 9am
  across daylight saving changes.
- **Overlaps are blocked by a Postgres exclusion constraint** on each booking's time
  range, including the clean-down buffer. Every booking or change also re-checks the
  requested time on the server, rather than trusting what the browser sent.
- **Customers manage bookings through a signed link** (an HMAC of the booking id). There
  are no stored tokens and no accounts. Viewing only ever reads; changes are POSTs behind
  a confirmation step.
- **Tested where it matters.** Unit tests cover availability, both UK clock changes and
  a US one. Database tests run against real Postgres, including a race in which six
  simultaneous requests for one slot must produce exactly one booking.

Design decisions and their trade-offs are recorded in [ROADMAP.md](ROADMAP.md).

### Tech stack

Next.js 16 (App Router, server actions) · TypeScript · Prisma 7 · PostgreSQL · Tailwind
CSS 4 · Vitest · GitHub Actions · Vercel + Neon

### Running it locally

Requires Node 24 and Docker.

```bash
cp .env.example .env              # then set AUTH_SECRET: npx auth secret
docker compose up -d --wait       # Postgres on port 5433
npm install
npx prisma migrate dev
npm run seed                      # a demo salon with six weeks of bookings
npm run dev                       # http://localhost:3000
```

`npm test` runs the unit tests; `npm run test:db` runs the database tests on a separate
test database, which it creates automatically.
