import { describe, expect, it } from "vitest";
import { isOverlapError } from "./overlap-error";

// Shape captured from Prisma 7.10 with @prisma/adapter-pg on a real violation.
const prismaError = (originalCode: string) =>
  Object.assign(new Error("Invalid `prisma.booking.create()` invocation"), {
    code: "P2039",
    meta: {
      modelName: "Booking",
      driverAdapterError: {
        name: "DriverAdapterError",
        cause: { originalCode, kind: "postgres", code: originalCode },
      },
    },
  });

describe("isOverlapError", () => {
  it("recognises an exclusion violation reported through Prisma", () => {
    expect(isOverlapError(prismaError("23P01"))).toBe(true);
  });

  it("recognises one reported by the driver directly", () => {
    expect(isOverlapError({ cause: { originalCode: "23P01" } })).toBe(true);
  });

  it("ignores other database errors", () => {
    expect(isOverlapError(prismaError("23505"))).toBe(false);
  });

  it("ignores values that aren't errors at all", () => {
    [null, undefined, "23P01", 42, new Error("boom")].forEach((value) =>
      expect(isOverlapError(value)).toBe(false),
    );
  });
});
