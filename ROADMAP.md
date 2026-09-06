# Booking Platform — Roadmap

Online booking for a single-location service business: publish your availability, let
customers book and pay a deposit, manage it all from an admin calendar. The demo models a
dog grooming salon, whose service durations vary from a 15-minute nail trim to a 90-minute
full groom — enough variation that the availability engine has to do real work rather than
slotting everything into identical blocks.

This file records the architectural decisions and their trade-offs. The
[README](README.md) covers what the product does and how to run it.

## Architecture

| Piece            | Choice                | Notes                                  |
| ---------------- | --------------------- | -------------------------------------- |
| App              | Next.js (App Router)  | Booking page, admin, and API in one    |
| Database         | Postgres via Prisma   | `pg` driver adapter                    |
| Auth             | Auth.js, email links  | One admin; customers never sign up     |
| Payments         | Stripe Checkout       | Test mode                              |
| Scheduled work   | Vercel Cron           | Reminder emails; no always-on process  |

## Availability is stored as rules, not slots

The obvious model — generate bookable slots into a table and mark them taken — is wrong
here. It forces a decision about how far into the future slots exist, it makes changing
opening hours a migration over generated rows, and it stores a large number of rows that
are only interesting when someone books one.

Instead, availability is three small tables:

- `AvailabilityRule` — recurring weekly patterns ("every Tuesday, 09:00–17:00").
- `AvailabilityException` — one-off closures, holidays, extra sessions.
- `Booking` — what has actually been taken.

Bookable slots are then **derived on read**: rules, minus exceptions, minus existing
bookings, minus the buffers configured on each service. That derivation is the core logic
of the product, it is pure, and it carries the bulk of the test suite.

## Timezones

Everything is stored in UTC and rendered in the business's timezone, which is a stored
property of the business rather than an assumption baked into the code.

The case that matters is a DST transition. On the two days a year when the clocks change,
"every Tuesday at 9am" is not a fixed number of hours after the previous Tuesday at 9am.
Naive date arithmetic silently moves such a booking by an hour, and a customer arrives to a
closed door. Recurring rules are therefore resolved in the business's local timezone and
then converted to instants, not stored as fixed UTC offsets.

## Double booking is prevented in the database

Two customers can pick the same slot in the same second. Checking availability and then
inserting leaves a window between the two in which both requests believe the slot is free,
and no amount of application-level care closes it.

The constraint therefore lives in the database, so the second write fails rather than
succeeding into an overlapping booking. The UI's job is to turn that failure into a civil
"sorry, that slot just went" and re-render the picker.

## Customers do not get accounts

Booking requires a name, an email and a phone number — not a password. An account is a
barrier in front of a transaction the customer wants to complete once, on a phone, in under
a minute.

Cancellation and rescheduling therefore work from a signed token in a link. Those links
follow the same rule as the admin's magic links: **GET renders, POST mutates**. A mail
client that prefetches URLs must not be able to cancel someone's appointment by previewing
the confirmation email.

## Payments hold the slot, not the intent

Deposits exist because no-shows are the main way this kind of business loses money. The
consequence is that a booking is only confirmed once payment succeeds, which means the
abandoned checkout case has to be handled deliberately: a slot is held for the duration of
the Stripe session and released when it expires, so someone who opens checkout and wanders
off does not take a Saturday morning appointment out of circulation indefinitely.

Payment is configurable per service — none, a deposit, or pay in full — because a
15-minute nail trim and a 90-minute groom do not warrant the same commitment.

## Single practitioner, single business

The data model deliberately assumes one business and one person doing the work.

Multi-practitioner scheduling is a genuinely useful feature and a natural extension, but it
changes the availability engine from "is this slot free?" into an assignment problem —
which staff member, with which skills, at which location — and that complexity would
dominate the project. Multi-tenancy is excluded for the same reason: nothing here needs
organisations, team roles or invitations, and adding them would mean building a different,
larger product than the one described above.

## Deliberately out of scope

- **Staff rostering and multi-practitioner scheduling** — see above.
- **SMS reminders** — a per-message cost for no capability email lacks here.
- **Recurring or subscription bookings.**
- **Two-way calendar sync.** One-way (bookings appear in the owner's calendar) is most of
  the value; syncing back means resolving conflicts between two systems that both believe
  they own the appointment.

## Planned

Roughly in order.

1. **Availability engine** — the models above and slot derivation, with tests.
2. **Customer booking flow** — service, date, slot, details, confirm; confirmation email
   with an `.ics` attachment; token-based cancel and reschedule.
3. **Payments** — Stripe Checkout, per-service payment rules, refunds within a
   configurable cancellation window.
4. **Admin** — day/week/month calendar, manual booking entry for phone bookings, customer
   history, one-way Google Calendar sync, and reminder emails 24 hours ahead.
