import { describe, expect, it, vi, beforeEach } from "vitest";

const authMock = vi.fn();
const userFindUnique = vi.fn();
const userUpdate = vi.fn();
const auditLogCreate = vi.fn();
const bcryptCompare = vi.fn();

vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => authMock(...a) }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => userFindUnique(...a),
      update: (...a: unknown[]) => userUpdate(...a),
    },
    auditLog: { create: (...a: unknown[]) => auditLogCreate(...a) },
  },
}));
vi.mock("bcryptjs", () => ({ default: { compare: (...a: unknown[]) => bcryptCompare(...a) } }));

const { regenerateRecoveryCodes } = await import("@/server/actions/two-factor");

const USER = { id: "user-1", passwordHash: "hashed", twoFactorEnabled: true };

function formData(password: string) {
  const fd = new FormData();
  fd.set("password", password);
  return fd;
}

beforeEach(() => {
  authMock.mockReset();
  userFindUnique.mockReset();
  userUpdate.mockReset();
  auditLogCreate.mockReset();
  bcryptCompare.mockReset();
  authMock.mockResolvedValue({ user: { id: USER.id } });
});

describe("regenerateRecoveryCodes", () => {
  it("refuses when not signed in", async () => {
    authMock.mockResolvedValue(null);
    const result = await regenerateRecoveryCodes({ status: "idle" }, formData("pw"));
    expect(result.status).toBe("error");
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("refuses an incorrect password without touching the stored codes", async () => {
    userFindUnique.mockResolvedValue(USER);
    bcryptCompare.mockResolvedValue(false);

    const result = await regenerateRecoveryCodes({ status: "idle" }, formData("wrong"));

    expect(result.status).toBe("error");
    expect(result.message).toMatch(/incorrect password/i);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("refuses when two-factor isn't enabled on the account", async () => {
    userFindUnique.mockResolvedValue({ ...USER, twoFactorEnabled: false });
    bcryptCompare.mockResolvedValue(true);

    const result = await regenerateRecoveryCodes({ status: "idle" }, formData("correct"));

    expect(result.status).toBe("error");
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("replaces the recovery codes wholesale on success", async () => {
    userFindUnique.mockResolvedValue(USER);
    bcryptCompare.mockResolvedValue(true);
    userUpdate.mockResolvedValue({});
    auditLogCreate.mockResolvedValue({});

    const result = await regenerateRecoveryCodes({ status: "idle" }, formData("correct"));

    expect(result.status).toBe("success");
    expect(result.recoveryCodes).toHaveLength(10);
    // Every code is unique — this would fail if the RNG were reused/seeded badly.
    expect(new Set(result.recoveryCodes)).toHaveProperty("size", 10);

    expect(userUpdate).toHaveBeenCalledTimes(1);
    const call = userUpdate.mock.calls[0][0];
    expect(call.where).toEqual({ id: USER.id });
    expect(call.data.twoFactorRecoveryCodes).toHaveLength(10);
    // The stored value is hashes, never the plaintext codes just returned to the client.
    for (const stored of call.data.twoFactorRecoveryCodes) {
      expect(result.recoveryCodes).not.toContain(stored);
    }

    expect(auditLogCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({
        actorId: USER.id,
        action: "user.two_factor_recovery_codes_regenerated",
      }),
    });
  });
});
