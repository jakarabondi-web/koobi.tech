import { redirect } from "next/navigation";
import type { AssessmentAttemptStatus, IdentityStatus, VerificationCheckResult } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { evaluateTrainerGate, type TrainerGateState } from "@/lib/permissions/gating";
import { surfaceForRoles, type GlobalRole } from "@/lib/permissions/roles";
import { isReadinessComplete } from "@/server/services/readiness";

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
    // A passed screener doesn't count here — only the domain qualification
    // exam satisfies "assessment passed" for the gate.
    prisma.assessmentAttempt.findFirst({
      where: { userId, status: "PASSED", assessment: { stage: "QUALIFICATION" } },
      select: { id: true },
    }),
  ]);

  // Readiness only matters once the applicant is otherwise approved — skip
  // the query for everyone still earlier in the funnel.
  const readinessComplete =
    application?.status === "APPROVED" ? await isReadinessComplete(userId) : false;

  return evaluateTrainerGate({
    application,
    identityStatus: identity?.status ?? null,
    hasPassedAssessment: Boolean(passedAttempt),
    readinessComplete,
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

export type ApplicantReadiness = {
  hasPassedAssessment: boolean;
  /** The attempt to show a reviewer, chosen by most recently touched. */
  latestAttempt: {
    status: AssessmentAttemptStatus;
    /** 0–1. Null until submitted. */
    score: number | null;
    assessmentTitle: string;
    assessmentDomain: string;
    /** 0–1, the assessment's own pass bar — score is only meaningful next to this. */
    passThreshold: number;
    submittedAt: Date | null;
  } | null;
  identityStatus: IdentityStatus;
  identityChecks: {
    documentAuthentic: VerificationCheckResult | null;
    livenessPassed: VerificationCheckResult | null;
    faceMatchPassed: VerificationCheckResult | null;
    duplicateCheckPassed: VerificationCheckResult | null;
  } | null;
  /** What decideApplication actually enforces before it accepts APPROVED. */
  readyForApproval: boolean;
};

/**
 * What a reviewer needs to see to approve on the evidence, not on trust:
 * the assessment score against its own pass bar, and the identity checks
 * behind the single VERIFIED/FAILED badge — not just pass/fail restated.
 *
 * `applicationDomain`, if given, picks which attempt to *display* when
 * there's more than one: assessments aren't restricted to the domain
 * someone applied under, so without this a reviewer could be shown a
 * Software Engineering score while looking at a Legal application. Whether
 * the applicant qualifies at all is unaffected — that's a platform-wide
 * "has any passed attempt" rule, same as the trainer gate elsewhere, and
 * narrowing it to one domain here would quietly diverge from that.
 */
export async function getApplicantReadiness(
  userId: string,
  applicationDomain?: string | null
): Promise<ApplicantReadiness> {
  const [identity, attempts] = await Promise.all([
    prisma.identityVerification.findUnique({ where: { userId } }),
    prisma.assessmentAttempt.findMany({
      where: { userId },
      orderBy: [
        { submittedAt: { sort: "desc", nulls: "last" } },
        { startedAt: { sort: "desc", nulls: "last" } },
      ],
      include: { assessment: { select: { title: true, domain: true, passThreshold: true, stage: true } } },
    }),
  ]);

  // A passed screener alone doesn't qualify someone — same rule as the
  // trainer gate.
  const passedAttempt = attempts.find((a) => a.status === "PASSED" && a.assessment.stage === "QUALIFICATION");
  // Prefer the domain qualification exam over the screener when picking what
  // to show a reviewer — that's the score their approval decision hinges on.
  const latest =
    (applicationDomain &&
      attempts.find((a) => a.assessment.domain === applicationDomain && a.assessment.stage === "QUALIFICATION")) ||
    (applicationDomain && attempts.find((a) => a.assessment.domain === applicationDomain)) ||
    attempts[0];
  const identityStatus = identity?.status ?? "NOT_STARTED";

  return {
    hasPassedAssessment: Boolean(passedAttempt),
    latestAttempt: latest
      ? {
          status: latest.status,
          score: latest.score,
          assessmentTitle: latest.assessment.title,
          assessmentDomain: latest.assessment.domain,
          passThreshold: latest.assessment.passThreshold,
          submittedAt: latest.submittedAt,
        }
      : null,
    identityStatus,
    identityChecks: identity
      ? {
          documentAuthentic: identity.documentAuthentic,
          livenessPassed: identity.livenessPassed,
          faceMatchPassed: identity.faceMatchPassed,
          duplicateCheckPassed: identity.duplicateCheckPassed,
        }
      : null,
    readyForApproval: Boolean(passedAttempt) && identityStatus === "VERIFIED",
  };
}

/**
 * Blocks an APPROVED decision until the applicant has actually passed the
 * qualification assessment and cleared identity verification.
 *
 * Without this, nothing stopped a reviewer clicking Approve on day one —
 * `getTrainerGate` would still refuse the trainer dashboard access until
 * both were done, so no work was ever reachable, but the application's own
 * status would read APPROVED while the applicant hadn't qualified for
 * anything, which is wrong on its face and confusing for whoever reads the
 * decision later.
 */
export async function assertReadyForApplicationApproval(userId: string) {
  const readiness = await getApplicantReadiness(userId);
  if (readiness.readyForApproval) return readiness;

  const missing: string[] = [];
  if (!readiness.hasPassedAssessment) missing.push("passed the qualification assessment");
  if (readiness.identityStatus !== "VERIFIED") missing.push("completed identity verification");

  throw new GateError(
    `This applicant hasn't ${missing.join(" and ")} yet. Approval isn't available until both are done — ` +
      `use "Request info" or "Waitlist" instead if you need to respond now.`
  );
}
