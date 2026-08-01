import { prisma } from "@/lib/db/prisma";

export class DisputeError extends Error {}

/**
 * Settles a payment dispute a trainer raised. Record-only — resolving in the
 * trainer's favor doesn't move money on its own; that's a separate finance
 * action against the underlying earning, same as how adjudication overturns
 * a review without itself issuing a payout.
 */
export async function resolveDispute(params: {
  disputeId: string;
  resolvedBy: string;
  outcome: "RESOLVED_APPROVED" | "RESOLVED_DENIED";
  decision: string;
}) {
  const dispute = await prisma.dispute.findUnique({ where: { id: params.disputeId } });
  if (!dispute) throw new DisputeError("That dispute no longer exists.");
  if (dispute.status === "RESOLVED_APPROVED" || dispute.status === "RESOLVED_DENIED") {
    throw new DisputeError("That dispute has already been resolved.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.dispute.update({
      where: { id: params.disputeId },
      data: { status: params.outcome, decision: params.decision, resolvedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        actorId: params.resolvedBy,
        action: `dispute.${params.outcome.toLowerCase()}`,
        entityType: "Dispute",
        entityId: params.disputeId,
        metadata: { reason: dispute.reason, decision: params.decision },
      },
    });

    await tx.notification.create({
      data: {
        userId: dispute.userId,
        type: "dispute_resolved",
        title: params.outcome === "RESOLVED_APPROVED" ? "Your dispute was approved" : "Your dispute was denied",
        body: params.decision,
        link: "/trainer/support",
      },
    });

    return updated;
  });
}
