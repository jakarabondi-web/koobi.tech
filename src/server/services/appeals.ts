import { prisma } from "@/lib/db/prisma";

export class AppealError extends Error {}

/**
 * Opens a quality appeal against a specific review decision.
 *
 * One open appeal per review — a trainer re-submitting the same complaint
 * five times doesn't create five queue entries, it just tells them the
 * first one is still pending.
 */
export async function submitAppeal(params: { userId: string; reviewId: string; reason: string }) {
  const review = await prisma.review.findUnique({
    where: { id: params.reviewId },
    include: { submission: true },
  });
  if (!review) throw new AppealError("That review no longer exists.");
  if (review.submission.submittedById !== params.userId) {
    throw new AppealError("You can only appeal reviews on your own submissions.");
  }

  const existing = await prisma.qualityAppeal.findFirst({
    where: { reviewId: params.reviewId, userId: params.userId, status: { in: ["OPEN", "UNDER_REVIEW"] } },
  });
  if (existing) throw new AppealError("You already have an open appeal for this review.");

  return prisma.qualityAppeal.create({
    data: {
      userId: params.userId,
      reviewId: params.reviewId,
      submissionId: review.submissionId,
      reason: params.reason,
    },
  });
}

/** Every appeal still waiting on a decision, oldest first — a queue, not a log. */
export async function listOpenAppeals() {
  return prisma.qualityAppeal.findMany({
    where: { status: { in: ["OPEN", "UNDER_REVIEW"] } },
    include: {
      user: { select: { firstName: true, lastName: true, email: true } },
      review: { select: { decision: true, feedback: true, severity: true } },
      submission: {
        select: {
          id: true,
          task: { select: { template: { select: { name: true } }, project: { select: { name: true } } } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
}

/**
 * A lead/admin's binding call on an appeal — upheld (original review
 * stands) or overturned (the review's decision is wrong and shouldn't
 * count against the trainer). Overturning doesn't retroactively rewrite
 * the Review row itself — the review is a record of what a reviewer
 * decided, not a rolling "current truth" — but it is recorded here as the
 * decision of record for quality-scoring and support purposes.
 */
export async function decideAppeal(params: {
  appealId: string;
  decidedBy: string;
  outcome: "UPHELD" | "OVERTURNED";
  decision: string;
}) {
  const appeal = await prisma.qualityAppeal.findUnique({ where: { id: params.appealId } });
  if (!appeal) throw new AppealError("That appeal no longer exists.");
  if (appeal.status !== "OPEN" && appeal.status !== "UNDER_REVIEW") {
    throw new AppealError("That appeal has already been decided.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.qualityAppeal.update({
      where: { id: params.appealId },
      data: {
        status: params.outcome,
        decision: params.decision,
        decidedBy: params.decidedBy,
        decidedAt: new Date(),
      },
    });

    await tx.auditLog.create({
      data: {
        actorId: params.decidedBy,
        action: `quality_appeal.${params.outcome.toLowerCase()}`,
        entityType: "QualityAppeal",
        entityId: params.appealId,
        metadata: { reason: appeal.reason, decision: params.decision },
      },
    });

    return updated;
  });
}
