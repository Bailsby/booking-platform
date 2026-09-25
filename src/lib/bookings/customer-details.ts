export type CustomerDetails = {
  name: string;
  email: string;
  phone: string;
  notes: string | null;
};

export type DetailsField = keyof CustomerDetails;

export type DetailsResult =
  | { ok: true; details: CustomerDetails }
  | {
      ok: false;
      errors: Partial<Record<DetailsField, string>>;
      // Echoed back so the form can be re-rendered without losing what was typed.
      values: Record<DetailsField, string>;
    };

const MAX_NAME = 100;
const MAX_EMAIL = 254;
const MAX_NOTES = 500;

// Deliberately loose: the confirmation email is the real test of an address.
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const field = (form: FormData, name: DetailsField): string => {
  const value = form.get(name);
  return typeof value === "string" ? value.trim() : "";
};

const nameError = (name: string) =>
  name === "" ? "Please enter your name." : name.length > MAX_NAME ? "That name is too long." : null;

const emailError = (email: string) =>
  email === ""
    ? "Please enter your email address — your confirmation goes there."
    : email.length > MAX_EMAIL || !EMAIL.test(email)
      ? "That doesn't look like an email address."
      : null;

// Accepts UK and international formats; the groomer only needs to be able to ring it.
const phoneError = (phone: string) => {
  if (phone === "") return "Please enter a phone number, in case we need to reach you.";
  const digits = phone.replace(/\D/g, "");
  return /^\+?[\d\s()-]+$/.test(phone) && digits.length >= 10 && digits.length <= 15
    ? null
    : "That doesn't look like a phone number.";
};

const notesError = (notes: string) =>
  notes.length > MAX_NOTES ? `Please keep notes under ${MAX_NOTES} characters.` : null;

export const parseCustomerDetails = (form: FormData): DetailsResult => {
  const values: Record<DetailsField, string> = {
    name: field(form, "name").replace(/\s+/g, " "),
    email: field(form, "email").toLowerCase(),
    phone: field(form, "phone"),
    notes: field(form, "notes"),
  };

  const errors = Object.fromEntries(
    (
      [
        ["name", nameError(values.name)],
        ["email", emailError(values.email)],
        ["phone", phoneError(values.phone)],
        ["notes", notesError(values.notes)],
      ] as const
    ).filter(([, error]) => error !== null),
  ) as Partial<Record<DetailsField, string>>;

  return Object.keys(errors).length > 0
    ? { ok: false, errors, values }
    : { ok: true, details: { ...values, notes: values.notes === "" ? null : values.notes } };
};
