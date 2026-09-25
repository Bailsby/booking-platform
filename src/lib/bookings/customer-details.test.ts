import { describe, expect, it } from "vitest";
import { parseCustomerDetails } from "./customer-details";

const form = (fields: Record<string, string>) => {
  const data = new FormData();
  Object.entries(fields).forEach(([name, value]) => data.set(name, value));
  return data;
};

const valid = {
  name: "Sarah Whitfield",
  email: "sarah@example.com",
  phone: "07700 900123",
  notes: "Biscuit, cockapoo",
};

describe("parseCustomerDetails", () => {
  it("accepts complete details", () => {
    expect(parseCustomerDetails(form(valid))).toEqual({ ok: true, details: valid });
  });

  it("normalises whitespace and email case", () => {
    const result = parseCustomerDetails(
      form({ ...valid, name: "  Sarah   Whitfield ", email: " Sarah@Example.COM " }),
    );
    expect(result).toMatchObject({
      ok: true,
      details: { name: "Sarah Whitfield", email: "sarah@example.com" },
    });
  });

  it("treats blank notes as none", () => {
    expect(parseCustomerDetails(form({ ...valid, notes: "   " }))).toMatchObject({
      ok: true,
      details: { notes: null },
    });
  });

  it("accepts international phone numbers", () => {
    expect(parseCustomerDetails(form({ ...valid, phone: "+44 (0)113 496 0000" })).ok).toBe(true);
  });

  it("reports every problem at once, and echoes the input back", () => {
    const result = parseCustomerDetails(
      form({ name: "", email: "not-an-email", phone: "123", notes: "" }),
    );
    expect(result.ok).toBe(false);
    if (result.ok) return;
    expect(Object.keys(result.errors).sort()).toEqual(["email", "name", "phone"]);
    expect(result.values.email).toBe("not-an-email");
  });

  it("treats missing fields as empty rather than throwing", () => {
    const result = parseCustomerDetails(new FormData());
    expect(result.ok).toBe(false);
  });

  it("rejects phone numbers containing letters", () => {
    const result = parseCustomerDetails(form({ ...valid, phone: "07700 90O123" }));
    expect(result).toMatchObject({ ok: false, errors: { phone: expect.any(String) } });
  });

  it("limits the length of notes", () => {
    const result = parseCustomerDetails(form({ ...valid, notes: "x".repeat(501) }));
    expect(result).toMatchObject({ ok: false, errors: { notes: expect.any(String) } });
  });
});
