import { describe, expect, it, vi, beforeEach } from "vitest";

const identityVerificationFindUnique = vi.fn();
const identityVerificationUpdate = vi.fn();
const fileAssetFindMany = vi.fn();
const fileAssetDeleteMany = vi.fn();
const auditLogCreate = vi.fn();
const notificationCreate = vi.fn();
const transaction = vi.fn();
const deletePrivateFile = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    identityVerification: {
      findUnique: (...a: unknown[]) => identityVerificationFindUnique(...a),
      update: (...a: unknown[]) => identityVerificationUpdate(...a),
    },
    fileAsset: {
      findMany: (...a: unknown[]) => fileAssetFindMany(...a),
      deleteMany: (...a: unknown[]) => fileAssetDeleteMany(...a),
    },
    auditLog: { create: (...a: unknown[]) => auditLogCreate(...a) },
    notification: { create: (...a: unknown[]) => notificationCreate(...a) },
    $transaction: (...a: unknown[]) => transaction(...a),
  },
}));

vi.mock("@/lib/identity", () => ({ getIdentityProvider: vi.fn() }));

vi.mock("@/lib/storage/s3", () => ({
  deletePrivateFile: (...a: unknown[]) => deletePrivateFile(...a),
}));

const { reviewVerification } = await import("@/server/services/identity-verification");

beforeEach(() => {
  identityVerificationFindUnique.mockReset().mockResolvedValue({
    documentAssetId: "doc-1",
    selfieAssetId: "selfie-1",
  });
  identityVerificationUpdate.mockReset().mockResolvedValue({});
  fileAssetFindMany.mockReset().mockResolvedValue([
    { id: "doc-1", key: "identity-verification/user-1/x-document" },
    { id: "selfie-1", key: "identity-verification/user-1/x-selfie" },
  ]);
  fileAssetDeleteMany.mockReset().mockResolvedValue({ count: 2 });
  auditLogCreate.mockReset().mockResolvedValue({});
  notificationCreate.mockReset().mockResolvedValue({});
  transaction.mockReset().mockImplementation(async (ops: unknown[]) => ops);
  deletePrivateFile.mockReset().mockResolvedValue(undefined);
});

describe("reviewVerification — manual-upload image cleanup", () => {
  it("deletes both stored objects and clears the asset ids when a manual submission is decided", async () => {
    await reviewVerification({ userId: "user-1", reviewerId: "admin-1", approve: true, notes: "Looks good." });

    expect(identityVerificationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ documentAssetId: null, selfieAssetId: null }),
      })
    );
    expect(deletePrivateFile).toHaveBeenCalledWith("identity-verification/user-1/x-document");
    expect(deletePrivateFile).toHaveBeenCalledWith("identity-verification/user-1/x-selfie");
  });

  it("does nothing storage-related for a vendor-decided record with no assets", async () => {
    identityVerificationFindUnique.mockResolvedValue({ documentAssetId: null, selfieAssetId: null });

    await reviewVerification({ userId: "user-1", reviewerId: "admin-1", approve: false, notes: "Doesn't match." });

    expect(fileAssetFindMany).not.toHaveBeenCalled();
    expect(deletePrivateFile).not.toHaveBeenCalled();
  });

  it("doesn't let a storage delete failure block the recorded decision", async () => {
    deletePrivateFile.mockRejectedValue(new Error("bucket unreachable"));
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(
      reviewVerification({ userId: "user-1", reviewerId: "admin-1", approve: true, notes: "ok" })
    ).resolves.not.toThrow();
    expect(identityVerificationUpdate).toHaveBeenCalled();
  });
});
