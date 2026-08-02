import { describe, expect, it, vi, beforeEach } from "vitest";

const identityVerificationFindUnique = vi.fn();
const fileAssetCreate = vi.fn();
const fileAssetFindMany = vi.fn();
const consentRecordCreate = vi.fn();
const identityVerificationUpsert = vi.fn();
const auditLogCreate = vi.fn();
const transaction = vi.fn();

const isStorageConfigured = vi.fn();
const uploadPrivateFile = vi.fn();
const getSignedReadUrl = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    identityVerification: {
      findUnique: (...a: unknown[]) => identityVerificationFindUnique(...a),
      upsert: (...a: unknown[]) => identityVerificationUpsert(...a),
    },
    fileAsset: {
      create: (...a: unknown[]) => fileAssetCreate(...a),
      findMany: (...a: unknown[]) => fileAssetFindMany(...a),
    },
    consentRecord: { create: (...a: unknown[]) => consentRecordCreate(...a) },
    auditLog: { create: (...a: unknown[]) => auditLogCreate(...a) },
    $transaction: (...a: unknown[]) => transaction(...a),
  },
}));

vi.mock("@/lib/storage/s3", () => ({
  isStorageConfigured: (...a: unknown[]) => isStorageConfigured(...a),
  uploadPrivateFile: (...a: unknown[]) => uploadPrivateFile(...a),
  getSignedReadUrl: (...a: unknown[]) => getSignedReadUrl(...a),
  StorageError: class StorageError extends Error {},
}));

const { submitManualVerification, getManualVerificationPreviewUrls, ManualVerificationError } = await import(
  "@/server/services/manual-identity-verification"
);

function makeFile(name: string, type: string, sizeBytes: number): File {
  const bytes = new Uint8Array(sizeBytes);
  return new File([bytes], name, { type });
}

beforeEach(() => {
  identityVerificationFindUnique.mockReset().mockResolvedValue(null);
  fileAssetCreate.mockReset().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve({ id: `asset-${data.key}`, ...data })
  );
  fileAssetFindMany.mockReset().mockResolvedValue([]);
  consentRecordCreate.mockReset().mockResolvedValue({});
  identityVerificationUpsert.mockReset().mockResolvedValue({});
  auditLogCreate.mockReset().mockResolvedValue({});
  transaction.mockReset().mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({
      fileAsset: { create: fileAssetCreate },
      consentRecord: { create: consentRecordCreate },
      identityVerification: { upsert: identityVerificationUpsert },
      auditLog: { create: auditLogCreate },
    })
  );
  isStorageConfigured.mockReset().mockReturnValue(true);
  uploadPrivateFile.mockReset().mockResolvedValue(undefined);
  getSignedReadUrl.mockReset().mockResolvedValue("https://signed.example.com/x");
  process.env.STORAGE_BUCKET = "test-bucket";
});

const baseParams = {
  userId: "user-1",
  email: "trainer@example.com",
  consentVersion: "manual-v1",
};

describe("submitManualVerification", () => {
  it("refuses when storage isn't configured", async () => {
    isStorageConfigured.mockReturnValue(false);

    await expect(
      submitManualVerification({
        ...baseParams,
        documentFile: makeFile("id.jpg", "image/jpeg", 1000),
        selfieFile: makeFile("selfie.jpg", "image/jpeg", 1000),
      })
    ).rejects.toThrow(ManualVerificationError);
    expect(uploadPrivateFile).not.toHaveBeenCalled();
  });

  it("refuses when already verified", async () => {
    identityVerificationFindUnique.mockResolvedValue({ status: "VERIFIED", attempts: 0 });

    await expect(
      submitManualVerification({
        ...baseParams,
        documentFile: makeFile("id.jpg", "image/jpeg", 1000),
        selfieFile: makeFile("selfie.jpg", "image/jpeg", 1000),
      })
    ).rejects.toThrow(/already verified/i);
  });

  it("refuses past the attempt limit", async () => {
    identityVerificationFindUnique.mockResolvedValue({ status: "PENDING", attempts: 3 });

    await expect(
      submitManualVerification({
        ...baseParams,
        documentFile: makeFile("id.jpg", "image/jpeg", 1000),
        selfieFile: makeFile("selfie.jpg", "image/jpeg", 1000),
      })
    ).rejects.toThrow(/maximum number/i);
  });

  it("rejects a non-image file type", async () => {
    await expect(
      submitManualVerification({
        ...baseParams,
        documentFile: makeFile("id.pdf", "application/pdf", 1000),
        selfieFile: makeFile("selfie.jpg", "image/jpeg", 1000),
      })
    ).rejects.toThrow(/JPEG, PNG, or WebP/);
  });

  it("rejects a file over the size limit", async () => {
    await expect(
      submitManualVerification({
        ...baseParams,
        documentFile: makeFile("id.jpg", "image/jpeg", 9 * 1024 * 1024),
        selfieFile: makeFile("selfie.jpg", "image/jpeg", 1000),
      })
    ).rejects.toThrow(/too large/);
  });

  it("uploads both files and upserts a PENDING manual verification on success", async () => {
    await submitManualVerification({
      ...baseParams,
      documentFile: makeFile("id.jpg", "image/jpeg", 1000),
      selfieFile: makeFile("selfie.jpg", "image/jpeg", 1000),
    });

    expect(uploadPrivateFile).toHaveBeenCalledTimes(2);
    expect(identityVerificationUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-1" },
        create: expect.objectContaining({ status: "PENDING", provider: "manual" }),
      })
    );
    expect(consentRecordCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ userId: "user-1", type: "biometric_identity_verification" }) })
    );
  });
});

describe("getManualVerificationPreviewUrls", () => {
  it("returns nulls when storage isn't configured", async () => {
    isStorageConfigured.mockReturnValue(false);

    const result = await getManualVerificationPreviewUrls({ documentAssetId: "a", selfieAssetId: "b" });

    expect(result).toEqual({ documentUrl: null, selfieUrl: null });
  });

  it("returns nulls when neither asset id is set", async () => {
    const result = await getManualVerificationPreviewUrls({ documentAssetId: null, selfieAssetId: null });
    expect(result).toEqual({ documentUrl: null, selfieUrl: null });
  });

  it("generates signed urls for both assets", async () => {
    fileAssetFindMany.mockResolvedValue([
      { id: "doc-1", key: "identity-verification/user-1/x-document" },
      { id: "selfie-1", key: "identity-verification/user-1/x-selfie" },
    ]);

    const result = await getManualVerificationPreviewUrls({ documentAssetId: "doc-1", selfieAssetId: "selfie-1" });

    expect(getSignedReadUrl).toHaveBeenCalledWith("identity-verification/user-1/x-document");
    expect(getSignedReadUrl).toHaveBeenCalledWith("identity-verification/user-1/x-selfie");
    expect(result.documentUrl).toBe("https://signed.example.com/x");
    expect(result.selfieUrl).toBe("https://signed.example.com/x");
  });
});
