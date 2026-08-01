import type { RiskFlagStatus } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

export class RiskFlagError extends Error {}

/**
 * Records a human decision on a risk signal. Deliberately does not touch the
 * flagged account — enforcement (suspension, etc.) is a separate,
 * explicit action a reviewer takes on the trainer detail page, never a side
 * effect of resolving the flag itself.
 */
export async function resolveRiskFlag(params: {
  flagId: string;
  actorId: string;
  outcome: RiskFlagStatus;
  notes: string;
}) {
  const flag = await prisma.riskFlag.findUnique({ where: { id: params.flagId } });
  if (!flag) throw new RiskFlagError("That risk flag no longer exists.");
  if (flag.status !== "OPEN") throw new RiskFlagError("This flag has already been resolved.");

  const details = (flag.details as Record<string, unknown> | null) ?? {};

  return prisma.$transaction(async (tx) => {
    const updated = await tx.riskFlag.update({
      where: { id: params.flagId },
      data: { status: params.outcome, details: { ...details, resolutionNotes: params.notes } },
    });

    await tx.auditLog.create({
      data: {
        actorId: params.actorId,
        action: `risk_flag.${params.outcome.toLowerCase()}`,
        entityType: "RiskFlag",
        entityId: params.flagId,
        metadata: { signal: flag.signal, notes: params.notes },
      },
    });

    return updated;
  });
}
