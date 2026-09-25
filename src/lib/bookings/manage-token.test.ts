import { describe, expect, it } from "vitest";
import { isValidManageToken, manageToken } from "./manage-token";

const key = "test-secret";

describe("manage tokens", () => {
  it("accepts the token issued for a booking", () => {
    expect(isValidManageToken("booking-1", manageToken("booking-1", key), key)).toBe(true);
  });

  it("rejects a token issued for a different booking", () => {
    expect(isValidManageToken("booking-2", manageToken("booking-1", key), key)).toBe(false);
  });

  it("rejects a token signed with a different key", () => {
    expect(isValidManageToken("booking-1", manageToken("booking-1", "other"), key)).toBe(false);
  });

  it("rejects missing, truncated and non-string tokens", () => {
    const token = manageToken("booking-1", key);
    expect(isValidManageToken("booking-1", undefined, key)).toBe(false);
    expect(isValidManageToken("booking-1", ["a"], key)).toBe(false);
    expect(isValidManageToken("booking-1", token.slice(0, -1), key)).toBe(false);
  });

  it("produces URL-safe tokens", () => {
    expect(manageToken("booking-1", key)).toMatch(/^[A-Za-z0-9_-]+$/);
  });
});
