import { describe, expect, it, vi, beforeEach } from "vitest";

const identityFindUnique = vi.fn();
const attemptFindMany = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    identityVerification: { findUnique: (...a: unknown[]) => identityFindUnique(...a) },
    assessmentAttempt: { findMany: (...a: unknown[]) => attemptFindMany(...a) },
  },
}));

const { assertReadyForApplicationApproval, getApplicantReadiness, GateError } = await import(
  "@/server/services/trainer-gate"
);

function attempt(status: string, score: number | null, overrides: Partial<Record<string, unknown>> = {}) {
  return {
    status,
    score,
    submittedAt: status === "AVAILABLE" || status === "IN_PROGRESS" ? null : new Date(),
    assessment: { title: "Legal reasoning", domain: "Legal", passThreshold: 0.8, stage: "QUALIFICATION" },
    ...overrides,
  };
}

beforeEach(() => {
  identityFindUnique.mockReset();
  attemptFindMany.mockReset();
});

describe("application approval requires real evidence, not trust", () => {
  it("refuses approval when the assessment isn't done", async () => {
    identityFindUnique.mockResolvedValue(null);
    attemptFindMany.mockResolvedValue([]);

    await expect(assertReadyForApplicationApproval("user-1")).rejects.toThrow(GateError);
    await expect(assertReadyForApplicationApproval("user-1")).rejects.toThrow(
      /passed the qualification assessment/
    );
  });

  it("refuses approval when the assessment was failed, even with identity verified", async () => {
    identityFindUnique.mockResolvedValue({
      status: "VERIFIED",
      documentAuthentic: "PASS",
      livenessPassed: "PASS",
      faceMatchPassed: "PASS",
      duplicateCheckPassed: "PASS",
    });
    attemptFindMany.mockResolvedValue([attempt("FAILED", 0.55)]);

    await expect(assertReadyForApplicationApproval("user-1")).rejects.toThrow(
      /passed the qualification assessment/
    );
  });

  it("allows approval on a passed assessment alone — identity verification is not a precondition", async () => {
    identityFindUnique.mockResolvedValue({
      status: "PENDING",
      documentAuthentic: null,
      livenessPassed: null,
      faceMatchPassed: null,
      duplicateCheckPassed: null,
    });
    attemptFindMany.mockResolvedValue([attempt("PASSED", 0.92)]);

    await expect(assertReadyForApplicationApproval("user-1")).resolves.toMatchObject({
      readyForApproval: true,
    });
  });

  it("allows approval even when identity verification hasn't started at all", async () => {
    identityFindUnique.mockResolvedValue(null);
    attemptFindMany.mockResolvedValue([attempt("PASSED", 0.92)]);

    await expect(assertReadyForApplicationApproval("user-1")).resolves.toMatchObject({
      readyForApproval: true,
    });
  });

  it("surfaces the score and the assessment's own pass bar for the reviewer to judge", async () => {
    identityFindUnique.mockResolvedValue(null);
    attemptFindMany.mockResolvedValue([attempt("FAILED", 0.62)]);

    const readiness = await getApplicantReadiness("user-1");
    expect(readiness.latestAttempt).toMatchObject({
      status: "FAILED",
      score: 0.62,
      passThreshold: 0.8,
      assessmentDomain: "Legal",
    });
  });

  it("prefers the attempt matching the domain applied for, over a more recent unrelated one", async () => {
    identityFindUnique.mockResolvedValue(null);
    attemptFindMany.mockResolvedValue([
      attempt("PASSED", 0.92, {
        assessment: { title: "Software eng.", domain: "Software Engineering", passThreshold: 0.75, stage: "QUALIFICATION" },
      }),
      attempt("FAILED", 0.6, {
        assessment: { title: "Legal reasoning", domain: "Legal", passThreshold: 0.8, stage: "QUALIFICATION" },
      }),
    ]);

    const readiness = await getApplicantReadiness("user-1", "Legal");
    expect(readiness.latestAttempt).toMatchObject({ assessmentDomain: "Legal", score: 0.6 });
    // Qualification itself stays platform-wide — a pass in any domain counts,
    // matching the trainer gate elsewhere, even though the *display* prefers
    // the applied-for domain.
    expect(readiness.hasPassedAssessment).toBe(true);
  });

  it("falls back to the most recent attempt when none match the applied-for domain", async () => {
    identityFindUnique.mockResolvedValue(null);
    attemptFindMany.mockResolvedValue([attempt("PASSED", 0.92)]); // domain: "Legal"

    const readiness = await getApplicantReadiness("user-1", "Medicine");
    expect(readiness.latestAttempt?.assessmentDomain).toBe("Legal");
  });

  it("picks the most recently submitted attempt when there have been several", async () => {
    identityFindUnique.mockResolvedValue(null);
    // findMany is mocked to just return what the query would, in the order
    // the real orderBy (submittedAt desc, nulls last) would produce.
    attemptFindMany.mockResolvedValue([attempt("PASSED", 0.85), attempt("FAILED", 0.5)]);

    const readiness = await getApplicantReadiness("user-1");
    expect(readiness.latestAttempt?.status).toBe("PASSED");
    expect(readiness.hasPassedAssessment).toBe(true);
  });
});
