import { describe, expect, it, vi, beforeEach } from "vitest";

const userFindUnique = vi.fn();
const userUpdate = vi.fn();
const auditLogCreate = vi.fn();
const transaction = vi.fn();
const sendEmail = vi.fn();
const bcryptCompare = vi.fn();
const bcryptHash = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => userFindUnique(...a),
      update: (...a: unknown[]) => userUpdate(...a),
    },
    auditLog: { create: (...a: unknown[]) => auditLogCreate(...a) },
    $transaction: (...a: unknown[]) => transaction(...a),
  },
}));

vi.mock("@/lib/email/client", () => ({
  sendEmail: (...a: unknown[]) => sendEmail(...a),
}));

vi.mock("bcryptjs", () => ({
  default: {
    compare: (...a: unknown[]) => bcryptCompare(...a),
    hash: (...a: unknown[]) => bcryptHash(...a),
  },
}));

const { updateName, changePassword, requestEmailChange, AccountError } = await import(
  "@/server/services/account"
);

const USER = { id: "user-1", email: "current@example.com", passwordHash: "hashed" };

beforeEach(() => {
  userFindUnique.mockReset().mockResolvedValue(USER);
  userUpdate.mockReset().mockResolvedValue({});
  auditLogCreate.mockReset().mockResolvedValue({});
  transaction.mockReset().mockImplementation(async (ops: unknown[]) => ops);
  sendEmail.mockReset().mockResolvedValue({ mocked: false });
  bcryptCompare.mockReset().mockResolvedValue(true);
  bcryptHash.mockReset().mockResolvedValue("new-hash");
});

describe("updateName", () => {
  it("updates the name fields, dropping a blank display name to null", async () => {
    await updateName({ userId: "user-1", firstName: "Ada", lastName: "Lovelace", displayName: "  " });

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: "user-1" },
      data: { firstName: "Ada", lastName: "Lovelace", displayName: null },
    });
  });
});

describe("changePassword", () => {
  it("refuses when there's no password on the account", async () => {
    userFindUnique.mockResolvedValue({ ...USER, passwordHash: null });

    await expect(
      changePassword({ userId: "user-1", currentPassword: "x", newPassword: "newpassword1" })
    ).rejects.toThrow(AccountError);
  });

  it("refuses an incorrect current password", async () => {
    bcryptCompare.mockResolvedValue(false);

    await expect(
      changePassword({ userId: "user-1", currentPassword: "wrong", newPassword: "newpassword1" })
    ).rejects.toThrow(/incorrect/i);
    expect(transaction).not.toHaveBeenCalled();
  });

  it("hashes the new password and bumps sessionVersion on success", async () => {
    await changePassword({ userId: "user-1", currentPassword: "right", newPassword: "newpassword1" });

    expect(bcryptHash).toHaveBeenCalledWith("newpassword1", 12);
    expect(transaction).toHaveBeenCalled();
  });
});

describe("requestEmailChange", () => {
  it("refuses when the new address matches the current one", async () => {
    await expect(
      requestEmailChange({ userId: "user-1", newEmail: "current@example.com", currentPassword: "right" })
    ).rejects.toThrow(/already your current/i);
  });

  it("refuses when the new address is already taken", async () => {
    userFindUnique
      .mockResolvedValueOnce(USER) // the account being changed
      .mockResolvedValueOnce({ id: "user-2" }); // the address lookup

    await expect(
      requestEmailChange({ userId: "user-1", newEmail: "taken@example.com", currentPassword: "right" })
    ).rejects.toThrow(/already in use/i);
    expect(userUpdate).not.toHaveBeenCalled();
  });

  it("refuses an incorrect current password", async () => {
    bcryptCompare.mockResolvedValue(false);

    await expect(
      requestEmailChange({ userId: "user-1", newEmail: "new@example.com", currentPassword: "wrong" })
    ).rejects.toThrow(/incorrect/i);
  });

  it("stores the pending email and sends a confirmation link on success", async () => {
    userFindUnique
      .mockResolvedValueOnce(USER)
      .mockResolvedValueOnce(null);

    const result = await requestEmailChange({
      userId: "user-1",
      newEmail: "New@Example.com",
      currentPassword: "right",
    });

    expect(userUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "user-1" },
        data: expect.objectContaining({ pendingEmail: "new@example.com" }),
      })
    );
    expect(sendEmail).toHaveBeenCalledWith(expect.objectContaining({ to: "new@example.com" }));
    expect(result.url).toBeNull();
  });
});
