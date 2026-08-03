import { describe, expect, it, vi, beforeEach } from "vitest";

process.env.AUTH_SECRET ??= "test-only-secret-do-not-use-in-real-deployment";

const loginEventFindMany = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: { loginEvent: { findMany: (...a: unknown[]) => loginEventFindMany(...a) } },
}));

const { recentLoginSummaries } = await import("@/server/services/login-events");
const { encryptField } = await import("@/lib/security/field-encryption");

beforeEach(() => {
  loginEventFindMany.mockReset();
});

describe("recentLoginSummaries", () => {
  it("decrypts the stored IP so the account security page shows the real address, not ciphertext", async () => {
    loginEventFindMany.mockResolvedValue([
      { id: "evt-1", userAgent: "Mozilla/5.0", ipAddress: encryptField("198.51.100.7"), createdAt: new Date() },
    ]);

    const [summary] = await recentLoginSummaries("user-1");

    expect(summary.ipAddress).toBe("198.51.100.7");
  });

  it("passes through null cleanly when no IP was recorded", async () => {
    loginEventFindMany.mockResolvedValue([
      { id: "evt-2", userAgent: "Mozilla/5.0", ipAddress: null, createdAt: new Date() },
    ]);

    const [summary] = await recentLoginSummaries("user-1");

    expect(summary.ipAddress).toBeNull();
  });

  it("shows a legacy row's plaintext IP instead of 500ing on it", async () => {
    // A row written before LoginEvent.ipAddress started encrypting — the
    // exact case that broke /trainer/settings when tested against real
    // pre-existing data.
    loginEventFindMany.mockResolvedValue([
      { id: "evt-3", userAgent: "Mozilla/5.0", ipAddress: "203.0.113.9", createdAt: new Date() },
    ]);

    const [summary] = await recentLoginSummaries("user-1");

    expect(summary.ipAddress).toBe("203.0.113.9");
  });
});
