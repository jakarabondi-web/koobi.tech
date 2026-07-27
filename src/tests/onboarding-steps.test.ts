import { describe, expect, it } from "vitest";

import { evaluateTrainerGate } from "@/lib/permissions/gating";
import { onboardingSteps } from "@/lib/permissions/onboarding-steps";

const submitted = { status: "SUBMITTED" as const, reviewerMessage: null };

/** Statuses in order, for compact assertions. */
function shape(gate: Parameters<typeof onboardingSteps>[0]) {
  return onboardingSteps(gate)?.map((s) => s.status);
}

describe("onboarding stepper", () => {
  it("puts a brand-new account on step one, nothing done", () => {
    const gate = evaluateTrainerGate({
      application: null,
      identityStatus: null,
      hasPassedAssessment: false,
    });
    expect(gate.stage).toBe("application_not_started");
    expect(shape(gate)).toEqual(["current", "upcoming", "upcoming", "upcoming", "upcoming"]);
  });

  it("advances to the assessment once the application is in", () => {
    const gate = evaluateTrainerGate({
      application: submitted,
      identityStatus: null,
      hasPassedAssessment: false,
    });
    expect(shape(gate)).toEqual(["done", "current", "upcoming", "upcoming", "upcoming"]);
  });

  it("advances to identity once the assessment is passed", () => {
    const gate = evaluateTrainerGate({
      application: submitted,
      identityStatus: "NOT_STARTED",
      hasPassedAssessment: true,
    });
    expect(gate.stage).toBe("identity_required");
    expect(shape(gate)).toEqual(["done", "done", "current", "upcoming", "upcoming"]);
  });

  it("stays on identity, but says documents are being reviewed, while pending", () => {
    const gate = evaluateTrainerGate({
      application: submitted,
      identityStatus: "PENDING",
      hasPassedAssessment: true,
    });
    expect(gate.stage).toBe("identity_processing");
    expect(gate.title).toMatch(/reviewing your documents/i);
    // Still the identity step — submitted is not the same as verified.
    expect(shape(gate)).toEqual(["done", "done", "current", "upcoming", "upcoming"]);
  });

  it("does not tell someone who already submitted to go and verify again", () => {
    const pending = evaluateTrainerGate({
      application: submitted,
      identityStatus: "PENDING",
      hasPassedAssessment: true,
    });
    const notStarted = evaluateTrainerGate({
      application: submitted,
      identityStatus: "NOT_STARTED",
      hasPassedAssessment: true,
    });
    expect(notStarted.actionLabel).toBe("Verify identity");
    expect(pending.actionLabel).not.toBe("Verify identity");
  });

  it("moves to human review once every applicant-side step is done", () => {
    const gate = evaluateTrainerGate({
      application: submitted,
      identityStatus: "VERIFIED",
      hasPassedAssessment: true,
    });
    expect(gate.stage).toBe("under_review");
    expect(shape(gate)).toEqual(["done", "done", "done", "current", "upcoming"]);
  });

  it("marks everything done once approved", () => {
    const gate = evaluateTrainerGate({
      application: { status: "APPROVED", reviewerMessage: null },
      identityStatus: "VERIFIED",
      hasPassedAssessment: true,
    });
    expect(gate.canAccessAssignments).toBe(true);
    expect(shape(gate)).toEqual(["done", "done", "done", "done", "done"]);
  });

  it("sends someone back to the application when more info is asked for", () => {
    const gate = evaluateTrainerGate({
      application: { status: "ADDITIONAL_INFO_REQUIRED", reviewerMessage: "Add a work sample." },
      identityStatus: "VERIFIED",
      hasPassedAssessment: true,
    });
    expect(shape(gate)).toEqual(["current", "upcoming", "upcoming", "upcoming", "upcoming"]);
  });

  it("renders no stepper for decided or paused applications", () => {
    for (const status of ["REJECTED", "WAITLISTED", "SUSPENDED"] as const) {
      const gate = evaluateTrainerGate({
        application: { status, reviewerMessage: null },
        identityStatus: "VERIFIED",
        hasPassedAssessment: true,
      });
      expect(onboardingSteps(gate)).toBeNull();
    }
  });

  it("only ever offers a link on the step being worked on", () => {
    const gate = evaluateTrainerGate({
      application: submitted,
      identityStatus: "NOT_STARTED",
      hasPassedAssessment: true,
    });
    const steps = onboardingSteps(gate)!;
    expect(steps.filter((s) => s.href)).toHaveLength(1);
    expect(steps.find((s) => s.href)?.key).toBe("identity");
  });
});
