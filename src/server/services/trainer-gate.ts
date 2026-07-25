import { prisma } from "@/lib/db/prisma";
import { evaluateTrainerGate, type TrainerGateState } from "@/lib/permissions/gating";

/**
 * Single source of truth for whether a trainer may access paid work.
 * Every assignment-bearing page and action calls this — never re-derive
 * the rule at the call site.
 */
export async function getTrainerGate(userId: string): Promise<TrainerGateState> {
  const [application, identity, passedAttempt] = await Promise.all([
    prisma.application.findUnique({
      where: { userId },
      select: { status: true, reviewerMessage: true },
    }),
    prisma.identityVerification.findUnique({ where: { userId }, select: { status: true } }),
    prisma.assessmentAttempt.findFirst({ where: { userId, status: "PASSED" }, select: { id: true } }),
  ]);

  return evaluateTrainerGate({
    application,
    identityStatus: identity?.status ?? null,
    hasPassedAssessment: Boolean(passedAttempt),
  });
}

export class GateError extends Error {}

/** Throws unless the trainer is cleared for assignments. */
export async function assertCanAccessAssignments(userId: string) {
  const gate = await getTrainerGate(userId);
  if (!gate.canAccessAssignments) throw new GateError(gate.title);
  return gate;
}
