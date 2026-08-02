import { describe, expect, it, vi, beforeEach } from "vitest";

const userFindUnique = vi.fn();
const userUpdate = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => userFindUnique(...a),
      update: (...a: unknown[]) => userUpdate(...a),
    },
  },
}));

vi.mock("@/lib/email/client", () => ({ sendEmail: vi.fn() }));

const { verifyEmailToken } = await import("@/server/services/email-verification");

const FUTURE = new Date(Date.now() + 3600_000);
const PAST = new Date(Date.now() - 3600_000);

beforeEach(() => {
  userFindUnique.mockReset();
  userUpdate.mockReset().mockResolvedValue({});
});

describe("verifyEmailToken — change-email confirmation (pendingEmail set)", () => {
  it("returns invalid when no user matches the token", async () => {
    userFindUnique.mockResolvedValue(null);

    expect(await verifyEmailToken("missing")).toBe("invalid");
  });

  it("returns expired when the change-email token has lapsed", async () => {
    userFindUnique.mockResolvedValue({
      id: "user-1",
      pendingEmail: "new@example.com",
      emailVerifiedAt: new Date(),
      emailVerificationExpiresAt: PAST,
    });

    expect(await verifyEmailToken("tok")).toBe("expired");
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("clears the pending change and returns invalid if someone else claimed the address meanwhile", async () => {
    userFindUnique
      .mockResolvedValueOnce({
        id: "user-1",
        pendingEmail: "new@example.com",
        emailVerifiedAt: new Date(),
        emailVerificationExpiresAt: FUTURE,
      })
      .mockResolvedValueOnce({ id: "user-2" }); // someone else now has that address

    expect(await verifyEmailToken("tok")).toBe("invalid");
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ pendingEmail: null }) })
    );
  });

  it("swaps email to the pending address and clears pendingEmail on success", async () => {
    userFindUnique
      .mockResolvedValueOnce({
        id: "user-1",
        pendingEmail: "new@example.com",
        emailVerifiedAt: new Date("2020-01-01"),
        emailVerificationExpiresAt: FUTURE,
      })
      .mockResolvedValueOnce(null); // address still free

    expect(await verifyEmailToken("tok")).toBe("verified");
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ email: "new@example.com", pendingEmail: null }),
      })
    );
  });
});

describe("verifyEmailToken — initial signup verification (no pendingEmail)", () => {
  it("still returns already_verified for a verified account with no pending change", async () => {
    userFindUnique.mockResolvedValue({
      id: "user-1",
      pendingEmail: null,
      emailVerifiedAt: new Date(),
      emailVerificationExpiresAt: FUTURE,
    });

    expect(await verifyEmailToken("tok")).toBe("already_verified");
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("verifies and activates an unverified account", async () => {
    userFindUnique.mockResolvedValue({
      id: "user-1",
      pendingEmail: null,
      emailVerifiedAt: null,
      emailVerificationExpiresAt: FUTURE,
    });

    expect(await verifyEmailToken("tok")).toBe("verified");
    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "ACTIVE" }) })
    );
  });
});
