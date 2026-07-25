import { prisma } from "@/lib/db/prisma";
import { getIdentityProvider } from "@/lib/identity";
import type { VerificationDecision } from "@/lib/identity";

export const MAX_VERIFICATION_ATTEMPTS = 3;
/** Re-verify annually; also triggered on high-risk changes. */
const VERIFICATION_VALIDITY_DAYS = 365;

export class VerificationError extends Error {}

/**
 * Starts a hosted verification session. Consent is recorded here, before the
 * applicant reaches the capture step — biometric processing requires explicit,
 * separately-recorded consent under BIPA and GDPR Art. 9.
 */
export async function startVerification(params: {
  userId: string;
  email: string;
  returnUrl: string;
  consentVersion: string;
  ipAddress?: string;
}) {
  const existing = await prisma.identityVerification.findUnique({ where: { userId: params.userId } });

  if (existing?.status === "VERIFIED") {
    throw new VerificationError("Your identity is already verified.");
  }
  if (existing && existing.attempts >= MAX_VERIFICATION_ATTEMPTS) {
    throw new VerificationError(
      "You've reached the maximum number of verification attempts. Contact support to continue."
    );
  }

  const provider = getIdentityProvider();
  const session = await provider.createSession({
    userId: params.userId,
    email: params.email,
    returnUrl: params.returnUrl,
  });

  await prisma.$transaction([
    prisma.consentRecord.create({
      data: {
        userId: params.userId,
        type: "biometric_identity_verification",
        version: params.consentVersion,
        ipAddress: params.ipAddress,
      },
    }),
    prisma.identityVerification.upsert({
      where: { userId: params.userId },
      create: {
        userId: params.userId,
        status: "PENDING",
        provider: provider.key,
        providerRef: session.sessionId,
        attempts: 1,
        submittedAt: new Date(),
      },
      update: {
        status: "PENDING",
        provider: provider.key,
        providerRef: session.sessionId,
        attempts: { increment: 1 },
        submittedAt: new Date(),
      },
    }),
  ]);

  return session;
}

/**
 * Pulls the provider's decision and records it.
 *
 * Only the decision and its per-check outcomes are stored — no images, no
 * templates. A NEEDS_REVIEW result is left for a human; we never auto-reject
 * an applicant on a single automated signal.
 */
export async function syncVerificationDecision(userId: string): Promise<VerificationDecision> {
  const record = await prisma.identityVerification.findUnique({ where: { userId } });
  if (!record?.providerRef) throw new VerificationError("No verification in progress.");

  const provider = getIdentityProvider();
  const decision = await provider.getDecision(record.providerRef);

  const status =
    decision.status === "VERIFIED"
      ? "VERIFIED"
      : decision.status === "REJECTED"
        ? "FAILED"
        : "PENDING";

  await prisma.identityVerification.update({
    where: { userId },
    data: {
      status,
      documentType: decision.documentType,
      documentCountry: decision.documentCountry,
      documentAuthentic: decision.documentAuthentic,
      livenessPassed: decision.livenessPassed,
      faceMatchPassed: decision.faceMatchPassed,
      duplicateCheckPassed: decision.duplicateCheckPassed,
      faceMatchScore: decision.faceMatchScore,
      notes: decision.reason,
      verifiedAt: status === "VERIFIED" ? new Date() : null,
      expiresAt:
        status === "VERIFIED"
          ? new Date(Date.now() + VERIFICATION_VALIDITY_DAYS * 86_400_000)
          : null,
    },
  });

  // A duplicate-account hit is a fraud signal, but never an automatic ban —
  // it opens a flag for human review, per the platform's enforcement policy.
  if (decision.duplicateCheckPassed === "FAIL") {
    await prisma.riskFlag.create({
      data: {
        userId,
        signal: "duplicate_identity_match",
        severity: "high",
        details: { providerRef: record.providerRef },
      },
    });
  }

  await prisma.auditLog.create({
    data: {
      actorId: userId,
      action: "identity.decision_recorded",
      entityType: "IdentityVerification",
      entityId: record.id,
      metadata: { status, mocked: decision.mocked },
    },
  });

  return decision;
}

/** Manual override for an inconclusive automated result. */
export async function reviewVerification(params: {
  userId: string;
  reviewerId: string;
  approve: boolean;
  notes: string;
}) {
  await prisma.$transaction([
    prisma.identityVerification.update({
      where: { userId: params.userId },
      data: {
        status: params.approve ? "VERIFIED" : "FAILED",
        reviewedBy: params.reviewerId,
        reviewedAt: new Date(),
        verifiedAt: params.approve ? new Date() : null,
        notes: params.notes,
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: params.reviewerId,
        action: params.approve ? "identity.manually_approved" : "identity.manually_rejected",
        entityType: "IdentityVerification",
        entityId: params.userId,
        metadata: { notes: params.notes },
      },
    }),
    prisma.notification.create({
      data: {
        userId: params.userId,
        type: "identity_reviewed",
        title: params.approve ? "Identity verified" : "Identity verification unsuccessful",
        body: params.approve
          ? "Your identity has been verified. You can now be matched to projects."
          : params.notes,
        link: "/trainer/profile",
      },
    }),
  ]);
}
