import { describe, expect, it, vi, beforeEach } from "vitest";

const findUnique = vi.fn();
const txMock = vi.fn();
const goldTaskResultFindMany = vi.fn();
const taskSubmissionFindMany = vi.fn();
const trainerProfileFindUnique = vi.fn();
const trainerProfileUpdate = vi.fn();
const qualityMetricCreate = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    adjudication: {
      findUnique: (...a: unknown[]) => findUnique(...a),
    },
    // Reached by recomputeQualityScore after a resolution, outside the
    // stubbed $transaction above — these just need to return "nothing to
    // score yet" so that recompute is a no-op for these guard tests.
    goldTaskResult: { findMany: (...a: unknown[]) => goldTaskResultFindMany(...a) },
    taskSubmission: { findMany: (...a: unknown[]) => taskSubmissionFindMany(...a) },
    trainerProfile: {
      findUnique: (...a: unknown[]) => trainerProfileFindUnique(...a),
      update: (...a: unknown[]) => trainerProfileUpdate(...a),
    },
    qualityMetric: { create: (...a: unknown[]) => qualityMetricCreate(...a) },
    $transaction: (...a: unknown[]) => txMock(...a),
  },
}));

const { resolveAdjudication, AdjudicationError } = await import("@/server/services/adjudication");

const SUBMITTER = "user-submitter";
const REVIEWER = "user-reviewer";
const NEUTRAL = "user-neutral";

function adjudication(reviews: { reviewerId: string; decision: string }[]) {
  return {
    id: "adj-1",
    status: "PENDING",
    submission: {
      id: "sub-1",
      taskId: "task-1",
      submittedById: SUBMITTER,
      reviews,
      task: { projectId: "proj-1", isGold: false, project: { payPerTaskCents: 5_00 } },
    },
  };
}

beforeEach(() => {
  findUnique.mockReset();
  txMock.mockReset();
  // Resolving for real would need the whole transaction surface; these cases
  // must be refused before it is ever reached, so a throwing stub doubles as
  // an assertion that nothing got that far.
  txMock.mockImplementation(() => {
    throw new Error("transaction should not run for a refused adjudication");
  });

  // Nothing for the post-resolution quality-score recompute to work with —
  // it short-circuits to a no-op, which is all these separation-of-duties
  // tests care about.
  goldTaskResultFindMany.mockReset().mockResolvedValue([]);
  taskSubmissionFindMany.mockReset().mockResolvedValue([]);
  trainerProfileFindUnique.mockReset();
  trainerProfileUpdate.mockReset();
  qualityMetricCreate.mockReset();
});

describe("adjudication separation of duties", () => {
  it("refuses to let someone adjudicate their own submission", async () => {
    findUnique.mockResolvedValue(adjudication([{ reviewerId: REVIEWER, decision: "REJECTED" }]));

    await expect(
      resolveAdjudication({
        adjudicationId: "adj-1",
        adjudicatorId: SUBMITTER, // the person who submitted the work
        decision: "APPROVED",
        notes: "Looks fine to me, says the author.",
      })
    ).rejects.toThrow(AdjudicationError);
  });

  it("refuses to let a reviewer adjudicate a submission they reviewed", async () => {
    findUnique.mockResolvedValue(adjudication([{ reviewerId: REVIEWER, decision: "REJECTED" }]));

    await expect(
      resolveAdjudication({
        adjudicationId: "adj-1",
        adjudicatorId: REVIEWER,
        decision: "APPROVED",
        notes: "Reversing the call I made myself earlier.",
      })
    ).rejects.toThrow(/someone else has to adjudicate/i);
  });

  it("refuses an already-resolved adjudication", async () => {
    findUnique.mockResolvedValue({ ...adjudication([]), status: "RESOLVED" });

    await expect(
      resolveAdjudication({
        adjudicationId: "adj-1",
        adjudicatorId: NEUTRAL,
        decision: "APPROVED",
        notes: "Trying to resolve this a second time.",
      })
    ).rejects.toThrow(/already resolved/i);
  });

  it("lets an uninvolved adjudicator through to the decision", async () => {
    findUnique.mockResolvedValue(adjudication([{ reviewerId: REVIEWER, decision: "REJECTED" }]));
    // Reaching the transaction is the pass condition: the guards let it by.
    let reached = false;
    txMock.mockImplementation(() => {
      reached = true;
      return Promise.resolve();
    });

    await resolveAdjudication({
      adjudicationId: "adj-1",
      adjudicatorId: NEUTRAL,
      decision: "APPROVED",
      notes: "Independent third look at this submission.",
    });

    expect(reached).toBe(true);
  });
});
