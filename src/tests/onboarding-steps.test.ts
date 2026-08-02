import { describe, expect, it } from "vitest";

import { evaluateTrainerGate } from "@/lib/permissions/gating";
import { onboardingSteps } from "@/lib/permissions/onboarding-steps";

const submitted = { status: "SUBMITTED" as const, reviewerMessage: null };
const approved = { status: "APPROVED" as const, reviewerMessage: null };

/** Statuses in order, for compact assertions. Order: application, assessment, review, readiness, identity, approved. */
function shape(gate: Parameters<typeof onboardingSteps>[0]) {
  return onboardingSteps(gate)?.map((s) => s.status);
}

describe("onboarding stepper", () => {
  it("puts a brand-new account on step one, nothing done", () => {
    const gate = evaluateTrainerGate({
      application: null,
      identityStatus: null,
      hasPassedAssessment: false,
      readinessComplete: false,
    });
    expect(gate.stage).toBe("application_not_started");
    expect(shape(gate)).toEqual(["current", "upcoming", "upcoming", "upcoming", "upcoming", "upcoming"]);
  });

  it("advances to the assessment once the application is in", () => {
    const gate = evaluateTrainerGate({
      application: submitted,
      identityStatus: null,
      hasPassedAssessment: false,
      readinessComplete: false,
    });
    expect(shape(gate)).toEqual(["done", "current", "upcoming", "upcoming", "upcoming", "upcoming"]);
  });

  it("moves straight to human review once the assessment passes — identity isn't checked before approval", () => {
    const gate = evaluateTrainerGate({
      application: submitted,
      identityStatus: "NOT_STARTED",
      hasPassedAssessment: true,
      readinessComplete: false,
    });
    expect(gate.stage).toBe("under_review");
    expect(shape(gate)).toEqual(["done", "done", "current", "upcoming", "upcoming", "upcoming"]);
  });

  it("stays on review regardless of identity status — that's not evaluated yet", () => {
    for (const identityStatus of ["NOT_STARTED", "PENDING", "VERIFIED", "FAILED"] as const) {
      const gate = evaluateTrainerGate({
        application: submitted,
        identityStatus,
        hasPassedAssessment: true,
        readinessComplete: false,
      });
      expect(gate.stage).toBe("under_review");
    }
  });

  it("requires the readiness program once approved but not yet complete", () => {
    const gate = evaluateTrainerGate({
      application: approved,
      identityStatus: "NOT_STARTED",
      hasPassedAssessment: true,
      readinessComplete: false,
    });
    expect(gate.stage).toBe("readiness_required");
    expect(gate.canAccessAssignments).toBe(false);
    expect(gate.actionHref).toBe("/trainer/readiness");
    expect(shape(gate)).toEqual(["done", "done", "done", "current", "upcoming", "upcoming"]);
  });

  it("only asks for identity verification after readiness is complete", () => {
    const gate = evaluateTrainerGate({
      application: approved,
      identityStatus: "NOT_STARTED",
      hasPassedAssessment: true,
      readinessComplete: true,
    });
    expect(gate.stage).toBe("identity_required");
    expect(shape(gate)).toEqual(["done", "done", "done", "done", "current", "upcoming"]);
  });

  it("stays on identity, but says documents are being reviewed, while pending", () => {
    const gate = evaluateTrainerGate({
      application: approved,
      identityStatus: "PENDING",
      hasPassedAssessment: true,
      readinessComplete: true,
    });
    expect(gate.stage).toBe("identity_processing");
    expect(gate.title).toMatch(/reviewing your documents/i);
    expect(shape(gate)).toEqual(["done", "done", "done", "done", "current", "upcoming"]);
  });

  it("does not tell someone who already submitted to go and verify again", () => {
    const pending = evaluateTrainerGate({
      application: approved,
      identityStatus: "PENDING",
      hasPassedAssessment: true,
      readinessComplete: true,
    });
    const notStarted = evaluateTrainerGate({
      application: approved,
      identityStatus: "NOT_STARTED",
      hasPassedAssessment: true,
      readinessComplete: true,
    });
    expect(notStarted.actionLabel).toBe("Verify identity");
    expect(pending.actionLabel).not.toBe("Verify identity");
  });

  it("marks everything done once approved, readiness is complete, and identity is verified", () => {
    const gate = evaluateTrainerGate({
      application: approved,
      identityStatus: "VERIFIED",
      hasPassedAssessment: true,
      readinessComplete: true,
    });
    expect(gate.canAccessAssignments).toBe(true);
    expect(shape(gate)).toEqual(["done", "done", "done", "done", "done", "done"]);
  });

  it("sends someone back to the application when more info is asked for", () => {
    const gate = evaluateTrainerGate({
      application: { status: "ADDITIONAL_INFO_REQUIRED", reviewerMessage: "Add a work sample." },
      identityStatus: "VERIFIED",
      hasPassedAssessment: true,
      readinessComplete: false,
    });
    expect(shape(gate)).toEqual(["current", "upcoming", "upcoming", "upcoming", "upcoming", "upcoming"]);
  });

  it("renders no stepper for decided or paused applications", () => {
    for (const status of ["REJECTED", "WAITLISTED", "SUSPENDED"] as const) {
      const gate = evaluateTrainerGate({
        application: { status, reviewerMessage: null },
        identityStatus: "VERIFIED",
        hasPassedAssessment: true,
        readinessComplete: false,
      });
      expect(onboardingSteps(gate)).toBeNull();
    }
  });

  it("only ever offers a link on the step being worked on", () => {
    const gate = evaluateTrainerGate({
      application: approved,
      identityStatus: "NOT_STARTED",
      hasPassedAssessment: true,
      readinessComplete: true,
    });
    const steps = onboardingSteps(gate)!;
    expect(steps.filter((s) => s.href)).toHaveLength(1);
    expect(steps.find((s) => s.href)?.key).toBe("identity");
  });
});
