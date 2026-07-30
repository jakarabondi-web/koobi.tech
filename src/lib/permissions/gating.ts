import type { ApplicationStatus, IdentityStatus } from "@prisma/client";

/**
 * Access gates that sit *between* "signed in" and "can do paid work".
 *
 * A trainer progresses: registered → email verified → application submitted
 * → screener passed → qualification exam passed → identity verified →
 * approved by an operations manager → readiness program completed → can
 * see and accept assignments.
 *
 * These are checked server-side wherever assignment data is read. UI copy
 * derives from the same source so what the trainer is told always matches
 * what the server actually enforces.
 */

export type TrainerGateState = {
  canAccessAssignments: boolean;
  /** Machine-readable stage, used to pick the right UI. */
  stage:
    | "application_not_started"
    | "assessment_required"
    | "identity_required"
    | "identity_processing"
    | "under_review"
    | "more_info_required"
    | "readiness_required"
    | "approved"
    | "rejected"
    | "waitlisted"
    | "suspended";
  title: string;
  message: string;
  /** Where to send the trainer to make progress, if anywhere. */
  actionHref?: string;
  actionLabel?: string;
};

export function evaluateTrainerGate(input: {
  application: { status: ApplicationStatus; reviewerMessage: string | null } | null;
  identityStatus: IdentityStatus | null;
  hasPassedAssessment: boolean;
  /** Has the trainer finished every calibration task in the readiness program for their domain? */
  readinessComplete: boolean;
}): TrainerGateState {
  const { application, identityStatus, hasPassedAssessment, readinessComplete } = input;

  if (!application || application.status === "DRAFT") {
    return {
      canAccessAssignments: false,
      stage: "application_not_started",
      title: "Finish your application",
      message:
        "Tell us about your background and areas of expertise so we can match you to the right projects.",
      actionHref: "/trainer/onboarding",
      actionLabel: "Start application",
    };
  }

  if (application.status === "SUSPENDED") {
    return {
      canAccessAssignments: false,
      stage: "suspended",
      title: "Your account is suspended",
      message:
        application.reviewerMessage ??
        "Your access to assignments is paused. Contact support if you believe this is a mistake.",
      actionHref: "/trainer/support",
      actionLabel: "Contact support",
    };
  }

  if (application.status === "REJECTED") {
    return {
      canAccessAssignments: false,
      stage: "rejected",
      title: "Application not accepted",
      message:
        application.reviewerMessage ??
        "We're not able to move forward with your application at this time. Thank you for your interest.",
      actionHref: "/trainer/support",
      actionLabel: "Contact support",
    };
  }

  if (application.status === "WAITLISTED") {
    return {
      canAccessAssignments: false,
      stage: "waitlisted",
      title: "You're on the waitlist",
      message:
        application.reviewerMessage ??
        "Your application was strong, but we don't have matching projects open right now. We'll be in touch as soon as that changes.",
    };
  }

  if (application.status === "ADDITIONAL_INFO_REQUIRED") {
    return {
      canAccessAssignments: false,
      stage: "more_info_required",
      title: "We need a bit more information",
      message:
        application.reviewerMessage ??
        "Our team has asked for additional details before we can complete your review.",
      actionHref: "/trainer/onboarding",
      actionLabel: "Update application",
    };
  }

  // Submitted, but the applicant still has steps of their own to complete.
  if (!hasPassedAssessment) {
    return {
      canAccessAssignments: false,
      stage: "assessment_required",
      title: "Complete your qualification assessment",
      message:
        "Pass a quick screening quiz, then a qualification exam in your area of expertise, to continue. You can take them whenever you're ready.",
      actionHref: "/trainer/assessments",
      actionLabel: "Start assessment",
    };
  }

  // Submitted and with the provider. Distinct from "not started" on
  // purpose: telling someone who already uploaded their documents that
  // verification "takes about two minutes" reads as though nothing was
  // received, and sends them to re-submit work they have already done.
  if (identityStatus === "PENDING") {
    return {
      canAccessAssignments: false,
      stage: "identity_processing",
      title: "We're reviewing your documents",
      message:
        "Your ID and selfie are with our verification provider. Most checks finish in a few minutes — we'll email you the moment there's a result.",
      actionHref: "/trainer/verification",
      actionLabel: "View status",
    };
  }

  if (identityStatus !== "VERIFIED") {
    return {
      canAccessAssignments: false,
      stage: "identity_required",
      title: "Verify your identity",
      message:
        "We verify every trainer's identity before they access client work. This takes about two minutes.",
      actionHref: "/trainer/verification",
      actionLabel: "Verify identity",
    };
  }

  if (application.status === "APPROVED") {
    if (!readinessComplete) {
      return {
        canAccessAssignments: false,
        stage: "readiness_required",
        title: "Complete your readiness program",
        message:
          "You're approved — one last step. Work through a short set of calibration tasks so we can see what you're strongest at and get you ranked before you start paid work.",
        actionHref: "/trainer/readiness",
        actionLabel: "Start readiness program",
      };
    }
    return {
      canAccessAssignments: true,
      stage: "approved",
      title: "You're approved",
      message: "You can browse projects and accept assignments.",
    };
  }

  // Everything on the applicant's side is done — waiting on a human.
  return {
    canAccessAssignments: false,
    stage: "under_review",
    title: "Your application is under review",
    message:
      "Thanks for completing every step. Our team is reviewing your application and will get back to you shortly — you'll receive an email as soon as there's a decision.",
  };
}
