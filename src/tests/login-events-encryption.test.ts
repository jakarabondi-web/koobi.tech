import { describe, expect, it, vi, beforeEach } from "vitest";

process.env.AUTH_SECRET ??= "test-only-secret-do-not-use-in-real-deployment";

const userUpdate = vi.fn();
const loginEventCreate = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: { update: (...a: unknown[]) => userUpdate(...a) },
    loginEvent: { create: (...a: unknown[]) => loginEventCreate(...a) },
  },
}));

const { recordSuccessfulLogin } = await import("@/lib/auth/login-events");
const { decryptField } = await import("@/lib/security/field-encryption");

beforeEach(() => {
  userUpdate.mockReset().mockResolvedValue({});
  loginEventCreate.mockReset().mockResolvedValue({});
});

describe("recordSuccessfulLogin — IP encryption", () => {
  it("stores the login IP encrypted, not in plaintext, on both User.lastLoginIp and LoginEvent.ipAddress", async () => {
    const hdrs = new Headers({ "x-forwarded-for": "203.0.113.42", "user-agent": "test-agent" });

    await recordSuccessfulLogin("user-1", hdrs);

    const userIp = userUpdate.mock.calls[0]?.[0]?.data?.lastLoginIp as string;
    const eventIp = loginEventCreate.mock.calls[0]?.[0]?.data?.ipAddress as string;

    expect(userIp).not.toBe("203.0.113.42");
    expect(eventIp).not.toBe("203.0.113.42");
    expect(decryptField(userIp)).toBe("203.0.113.42");
    expect(decryptField(eventIp)).toBe("203.0.113.42");
  });

  it("stores null, not an encrypted empty string, when no IP header is present", async () => {
    await recordSuccessfulLogin("user-2", undefined);

    expect(userUpdate.mock.calls[0]?.[0]?.data?.lastLoginIp).toBeNull();
    expect(loginEventCreate.mock.calls[0]?.[0]?.data?.ipAddress).toBeNull();
  });
});
