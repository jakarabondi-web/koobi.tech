import { describe, expect, it } from "vitest";

import { credentialExpiryStatus, daysUntil } from "@/lib/utils/credential-expiry";

describe("credentialExpiryStatus", () => {
  const now = new Date("2026-01-01T00:00:00Z");

  it("returns none when there is no expiry date", () => {
    expect(credentialExpiryStatus(null, now)).toBe("none");
  });

  it("returns expired for a past date", () => {
    expect(credentialExpiryStatus(new Date("2025-12-01T00:00:00Z"), now)).toBe("expired");
  });

  it("returns expired for the exact current moment", () => {
    expect(credentialExpiryStatus(now, now)).toBe("expired");
  });

  it("returns expiring_soon within the 30-day window", () => {
    expect(credentialExpiryStatus(new Date("2026-01-15T00:00:00Z"), now)).toBe("expiring_soon");
  });

  it("returns valid outside the 30-day window", () => {
    expect(credentialExpiryStatus(new Date("2026-06-01T00:00:00Z"), now)).toBe("valid");
  });
});

describe("daysUntil", () => {
  it("counts whole days forward", () => {
    const now = new Date("2026-01-01T00:00:00Z");
    expect(daysUntil(new Date("2026-01-11T00:00:00Z"), now)).toBe(10);
  });
});
