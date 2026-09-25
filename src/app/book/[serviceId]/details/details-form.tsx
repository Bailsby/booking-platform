"use client";

import Link from "next/link";
import { useActionState, type ReactNode } from "react";
import type { DetailsField } from "@/lib/bookings/customer-details";
import { createBookingAction, type DetailsFormState } from "../../actions";

type FieldProps = {
  name: DetailsField;
  label: string;
  hint?: string;
  state: DetailsFormState;
  children: (props: {
    id: string;
    name: DetailsField;
    defaultValue: string | undefined;
    "aria-invalid": boolean;
    "aria-describedby": string | undefined;
    className: string;
  }) => ReactNode;
};

function Field({ name, label, hint, state, children }: FieldProps) {
  const id = `field-${name}`;
  const error = state.errors?.[name];
  const describedBy = [hint && `${id}-hint`, error && `${id}-error`].filter(Boolean).join(" ") || undefined;
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium">
        {label}
      </label>
      {hint && (
        <p id={`${id}-hint`} className="mt-0.5 text-sm text-muted">
          {hint}
        </p>
      )}
      {children({
        id,
        name,
        defaultValue: state.values?.[name],
        "aria-invalid": Boolean(error),
        "aria-describedby": describedBy,
        className: `mt-1.5 block w-full rounded-lg border bg-surface px-3 py-2.5 outline-none focus:border-brand focus:ring-2 focus:ring-brand/20 ${
          error ? "border-danger" : "border-line"
        }`,
      })}
      {error && (
        <p id={`${id}-error`} className="mt-1 text-sm text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

export function DetailsForm({
  serviceId,
  start,
  pickerHref,
}: {
  serviceId: string;
  start: string;
  pickerHref: string;
}) {
  const [state, action, pending] = useActionState(createBookingAction, {});

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="serviceId" value={serviceId} />
      <input type="hidden" name="start" value={start} />

      {state.slotGone && (
        <div role="alert" className="rounded-lg bg-danger-soft p-4 text-sm">
          <p className="font-medium">Sorry — that time has just been taken.</p>
          <p className="mt-1">
            <Link href={pickerHref} className="underline">
              Choose another time
            </Link>
          </p>
        </div>
      )}

      <Field name="name" label="Your name" state={state}>
        {(props) => <input {...props} type="text" autoComplete="name" required />}
      </Field>
      <Field name="email" label="Email" hint="Your confirmation goes here." state={state}>
        {(props) => <input {...props} type="email" autoComplete="email" inputMode="email" required />}
      </Field>
      <Field name="phone" label="Phone" hint="Only used if we need to reach you about the appointment." state={state}>
        {(props) => <input {...props} type="tel" autoComplete="tel" required />}
      </Field>
      <Field
        name="notes"
        label="About your dog (optional)"
        hint="Name, breed, and anything we should know — nervous of dryers, sensitive paws."
        state={state}
      >
        {(props) => <textarea {...props} rows={3} maxLength={500} />}
      </Field>

      <button
        type="submit"
        disabled={pending}
        className="w-full rounded-lg bg-brand px-5 py-3 font-semibold text-white hover:bg-brand-strong disabled:opacity-60 sm:w-auto"
      >
        {pending ? "Booking…" : "Confirm booking"}
      </button>
    </form>
  );
}
