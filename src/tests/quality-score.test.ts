import { describe, expect, it, vi, beforeEach } from "vitest";

const goldTaskResultFindMany = vi.fn();
const taskSubmissionFindMany = vi.fn();
const trainerProfileFindUnique = vi.fn();
const trainerProfileUpdate = vi.fn();
const qualityMetricCreate = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    goldTaskResult: { findMany: (...a: unknown[]) => goldTaskResultFindMany(...a) },
    taskSubmission: { findMany: (...a: unknown[]) => taskSubmissionFindMany(...a) },
    trainerProfile: {
      findUnique: (...a: unknown[]) => trainerProfileFindUnique(...a),
      update: (...a: unknown[]) => trainerProfileUpdate(...a),
    },
    qualityMetric: { create: (...a: unknown[]) => qualityMetricCreate(...a) },
    $transaction: (ops: unknown[]) => Promise.all(ops as Promise<unknown>[]),
  },
}));

const { recomputeQualityScore } = await import("@/server/services/quality");

function submission(decision: string, adjudication: { status: string; finalDecision: string | null } | null = null) {
  return { reviews: [{ decision }], adjudication };
}

beforeEach(() => {
  goldTaskResultFindMany.mockReset();
  taskSubmissionFindMany.mockReset();
  trainerProfileFindUnique.mockReset();
  trainerProfileUpdate.mockReset().mockResolvedValue({});
  qualityMetricCreate.mockReset().mockResolvedValue({});
});

describe("quality score reflects gold accuracy and real review outcomes", () => {
  it("leaves the score untouched when there's no evidence yet", async () => {
    goldTaskResultFindMany.mockResolvedValue([]);
    taskSubmissionFindMany.mockResolvedValue([]);

    const result = await recomputeQualityScore("user-1");

    expect(result).toBeNull();
    expect(trainerProfileUpdate).not.toHaveBeenCalled();
  });

  it("weights gold-task accuracy higher than review approval rate", async () => {
    goldTaskResultFindMany.mockResolvedValue([{ passed: true }, { passed: true }, { passed: false }]); // 2/3
    taskSubmissionFindMany.mockResolvedValue([submission("REJECTED"), submission("REJECTED")]); // 0/2
    trainerProfileFindUnique.mockResolvedValue({ id: "profile-1" });

    const result = await recomputeQualityScore("user-1");

    // 0.6 * (2/3) + 0.4 * 0 = 0.4
    expect(result).toBeCloseTo(0.4, 5);
    expect(trainerProfileUpdate).toHaveBeenCalledWith({
      where: { userId: "user-1" },
      data: { qualityScore: expect.closeTo(0.4, 5) },
    });
  });

  it("falls back to review approval alone when no gold results exist yet", async () => {
    goldTaskResultFindMany.mockResolvedValue([]);
    taskSubmissionFindMany.mockResolvedValue([submission("APPROVED"), submission("REJECTED")]);
    trainerProfileFindUnique.mockResolvedValue({ id: "profile-1" });

    const result = await recomputeQualityScore("user-1");

    expect(result).toBeCloseTo(0.5, 5);
  });

  it("uses the lead reviewer's binding decision over an overturned raw review", async () => {
    goldTaskResultFindMany.mockResolvedValue([]);
    // Rejected by the reviewer, but a lead reviewer overturned it to approved —
    // the trainer's real outcome was an approval.
    taskSubmissionFindMany.mockResolvedValue([
      submission("REJECTED", { status: "RESOLVED", finalDecision: "APPROVED" }),
    ]);
    trainerProfileFindUnique.mockResolvedValue({ id: "profile-1" });

    const result = await recomputeQualityScore("user-1");

    expect(result).toBe(1);
  });

  it("does nothing if the user has no trainer profile", async () => {
    goldTaskResultFindMany.mockResolvedValue([{ passed: true }]);
    taskSubmissionFindMany.mockResolvedValue([]);
    trainerProfileFindUnique.mockResolvedValue(null);

    const result = await recomputeQualityScore("user-1");

    expect(result).toBeNull();
    expect(trainerProfileUpdate).not.toHaveBeenCalled();
  });
});
