import { redirect } from "next/navigation";

import { prisma } from "@/lib/db/prisma";
import { evaluateTrainerGate, type TrainerGateState } from "@/lib/permissions/gating";
import { surfaceForRoles, type GlobalRole } from "@/lib/permissions/roles";

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

/**
 * Gate check for actions that trainers and staff can both perform —
 * reviewing a submission, adjudicating a disagreement, handling payouts.
 *
 * Staff are cleared by their role, not by the trainer gate. An operations
 * or quality manager has no trainer application and never will, so running
 * the gate over them would refuse the work permanently, citing a step they
 * cannot take. A reviewer who *is* a trainer still has to be approved: the
 * scores they write move other people's quality ratings and pay.
 *
 * Throws GateError, so callers handle it exactly like assertCanAccessAssignments.
 */
export async function assertClearedForTrainerWork(user: {
  id: string;
  roles: GlobalRole[];
}): Promise<TrainerGateState | null> {
  if (surfaceForRoles(user.roles) === "admin") return null;
  return assertCanAccessAssignments(user.id);
}

/**
 * Page-level guard for the parts of the trainer portal an applicant has no
 * business seeing before approval — the marketplace, task queues, earnings,
 * payout details, quality history.
 *
 * Sends them back to their dashboard, which shows where their application
 * actually stands. This is what makes the restriction real: hiding the nav
 * links alone would still leave every one of these pages reachable by
 * typing the URL.
 */
export async function requireApprovedTrainer(userId: string) {
  const gate = await getTrainerGate(userId);
  if (!gate.canAccessAssignments) redirect("/trainer/dashboard");
  return gate;
}
