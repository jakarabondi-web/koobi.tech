import crypto from "node:crypto";

import { prisma } from "@/lib/db/prisma";
import { isStorageConfigured, uploadPrivateFile, getSignedReadUrl, StorageError } from "@/lib/storage/s3";
import { MAX_VERIFICATION_ATTEMPTS } from "@/server/services/identity-verification";

export class ManualVerificationError extends Error {}

const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_FILE_BYTES = 8 * 1024 * 1024;

function validateImage(label: string, file: File) {
  if (!ALLOWED_TYPES.has(file.type)) {
    throw new ManualVerificationError(`${label} must be a JPEG, PNG, or WebP image.`);
  }
  if (file.size > MAX_FILE_BYTES) {
    throw new ManualVerificationError(`${label} is too large — 8MB maximum.`);
  }
}

/**
 * The free, human-reviewed alternative to a vendor: a trainer uploads an ID
 * photo and a selfie directly, and an admin decides via reviewVerification()
 * (src/server/services/identity-verification.ts), same as they would for a
 * vendor's NEEDS_REVIEW result.
 *
 * This is the one place in the app that stores real identity images — see
 * the doc comment on IdentityVerification.documentAssetId in schema.prisma.
 * reviewVerification() deletes both objects the moment a decision is
 * recorded, so the retention window is "until reviewed," not indefinite.
 */
export async function submitManualVerification(params: {
  userId: string;
  email: string;
  documentFile: File;
  selfieFile: File;
  consentVersion: string;
  ipAddress?: string;
}) {
  if (!isStorageConfigured()) {
    throw new ManualVerificationError(
      "Manual verification isn't available in this environment yet — object storage isn't configured. Ask an administrator."
    );
  }

  const existing = await prisma.identityVerification.findUnique({ where: { userId: params.userId } });
  if (existing?.status === "VERIFIED") {
    throw new ManualVerificationError("Your identity is already verified.");
  }
  if (existing && existing.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    throw new ManualVerificationError(
      "You've reached the maximum number of verification attempts. Contact support to continue."
    );
  }

  validateImage("ID photo", params.documentFile);
  validateImage("Selfie", params.selfieFile);

  const [documentBuffer, selfieBuffer] = await Promise.all([
    params.documentFile.arrayBuffer().then((b) => Buffer.from(b)),
    params.selfieFile.arrayBuffer().then((b) => Buffer.from(b)),
  ]);

  const stamp = crypto.randomUUID();
  const documentKey = `identity-verification/${params.userId}/${stamp}-document`;
  const selfieKey = `identity-verification/${params.userId}/${stamp}-selfie`;

  try {
    await Promise.all([
      uploadPrivateFile({ key: documentKey, body: documentBuffer, contentType: params.documentFile.type }),
      uploadPrivateFile({ key: selfieKey, body: selfieBuffer, contentType: params.selfieFile.type }),
    ]);
  } catch (err) {
    if (err instanceof StorageError) throw new ManualVerificationError("Upload failed. Try again in a moment.");
    throw err;
  }

  const bucket = process.env.STORAGE_BUCKET!;

  await prisma.$transaction(async (tx) => {
    const [documentAsset, selfieAsset] = await Promise.all([
      tx.fileAsset.create({
        data: { ownerId: params.userId, bucket, key: documentKey, contentType: params.documentFile.type, sizeBytes: params.documentFile.size },
      }),
      tx.fileAsset.create({
        data: { ownerId: params.userId, bucket, key: selfieKey, contentType: params.selfieFile.type, sizeBytes: params.selfieFile.size },
      }),
    ]);

    await tx.consentRecord.create({
      data: {
        userId: params.userId,
        type: "biometric_identity_verification",
        version: params.consentVersion,
        ipAddress: params.ipAddress,
      },
    });

    await tx.identityVerification.upsert({
      where: { userId: params.userId },
      create: {
        userId: params.userId,
        status: "PENDING",
        provider: "manual",
        documentAssetId: documentAsset.id,
        selfieAssetId: selfieAsset.id,
        attempts: 1,
        submittedAt: new Date(),
      },
      update: {
        status: "PENDING",
        provider: "manual",
        providerRef: null,
        documentAssetId: documentAsset.id,
        selfieAssetId: selfieAsset.id,
        attempts: { increment: 1 },
        submittedAt: new Date(),
        // A fresh submission — any prior automated check outcomes no longer
        // apply, and a reviewer shouldn't see stale PASS/FAIL badges next to
        // images from a different attempt.
        documentAuthentic: null,
        livenessPassed: null,
        faceMatchPassed: null,
        duplicateCheckPassed: null,
        faceMatchScore: null,
        reviewedBy: null,
        reviewedAt: null,
        notes: null,
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: params.userId,
        action: "identity.manual_submitted",
        entityType: "IdentityVerification",
        entityId: params.userId,
      },
    });
  });
}

/** Short-lived preview URLs for an admin reviewing a manual submission — generate fresh per page view, never store. */
export async function getManualVerificationPreviewUrls(record: {
  documentAssetId: string | null;
  selfieAssetId: string | null;
}): Promise<{ documentUrl: string | null; selfieUrl: string | null }> {
  if (!isStorageConfigured() || (!record.documentAssetId && !record.selfieAssetId)) {
    return { documentUrl: null, selfieUrl: null };
  }

  const assets = await prisma.fileAsset.findMany({
    where: { id: { in: [record.documentAssetId, record.selfieAssetId].filter((x): x is string => Boolean(x)) } },
  });
  const documentAsset = assets.find((a) => a.id === record.documentAssetId);
  const selfieAsset = assets.find((a) => a.id === record.selfieAssetId);

  const [documentUrl, selfieUrl] = await Promise.all([
    documentAsset ? getSignedReadUrl(documentAsset.key) : Promise.resolve(null),
    selfieAsset ? getSignedReadUrl(selfieAsset.key) : Promise.resolve(null),
  ]);

  return { documentUrl, selfieUrl };
}
