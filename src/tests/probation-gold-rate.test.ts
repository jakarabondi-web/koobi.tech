import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

const applicationFindUnique = vi.fn();
const identityFindUnique = vi.fn();
const assessmentAttemptFindFirst = vi.fn();
const projectJurisdictionRuleFindMany = vi.fn();
const locationSignalFindFirst = vi.fn();
const projectAssignmentFindUnique = vi.fn();
const projectFindUniqueOrThrow = vi.fn();
const taskSubmissionCount = vi.fn();
const taskFindFirst = vi.fn();
const taskAssignmentCreate = vi.fn();
const taskUpdate = vi.fn();
const transaction = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    application: { findUnique: (...a: unknown[]) => applicationFindUnique(...a) },
    identityVerification: { findUnique: (...a: unknown[]) => identityFindUnique(...a) },
    assessmentAttempt: { findFirst: (...a: unknown[]) => assessmentAttemptFindFirst(...a) },
    projectJurisdictionRule: { findMany: (...a: unknown[]) => projectJurisdictionRuleFindMany(...a) },
    locationSignal: { findFirst: (...a: unknown[]) => locationSignalFindFirst(...a) },
    projectAssignment: { findUnique: (...a: unknown[]) => projectAssignmentFindUnique(...a) },
    project: { findUniqueOrThrow: (...a: unknown[]) => projectFindUniqueOrThrow(...a) },
    taskSubmission: { count: (...a: unknown[]) => taskSubmissionCount(...a) },
    task: { findFirst: (...a: unknown[]) => taskFindFirst(...a), update: (...a: unknown[]) => taskUpdate(...a) },
    taskAssignment: { create: (...a: unknown[]) => taskAssignmentCreate(...a) },
    $transaction: (...a: unknown[]) => transaction(...a),
  },
}));

const { assignNextTask, getProbationStatus, PROBATION_TASK_THRESHOLD, PROBATION_GOLD_RATE } = await import(
  "@/server/services/assignment"
);

const APPROVED_APPLICATION = { status: "APPROVED", reviewerMessage: null };

beforeEach(() => {
  applicationFindUnique.mockReset().mockResolvedValue(APPROVED_APPLICATION);
  identityFindUnique.mockReset().mockResolvedValue({ status: "VERIFIED" });
  assessmentAttemptFindFirst.mockReset().mockResolvedValue({ id: "attempt-1" });
  projectJurisdictionRuleFindMany.mockReset().mockResolvedValue([]);
  locationSignalFindFirst.mockReset().mockResolvedValue(null);
  projectAssignmentFindUnique.mockReset().mockResolvedValue({ status: "ACTIVE" });
  projectFindUniqueOrThrow.mockReset().mockResolvedValue({
    id: "proj-1",
    goldTaskRate: 0.05,
    consensusOverlap: 1,
  });
  taskFindFirst.mockReset().mockResolvedValue({ id: "task-1", isGold: true });
  taskAssignmentCreate.mockReset().mockResolvedValue({});
  taskUpdate.mockReset().mockResolvedValue({});
  transaction.mockReset().mockResolvedValue([]);
});

afterEach(() => {
  vi.restoreAllMocks();
});

describe("getProbationStatus", () => {
  it("reports probation for a trainer under the task threshold", async () => {
    taskSubmissionCount.mockReset().mockResolvedValue(3);

    const status = await getProbationStatus("user-1");

    expect(status).toMatchObject({
      inProbation: true,
      tasksCompleted: 3,
      tasksRemaining: PROBATION_TASK_THRESHOLD - 3,
    });
  });

  it("reports clear of probation once the threshold is met", async () => {
    taskSubmissionCount.mockReset().mockResolvedValue(PROBATION_TASK_THRESHOLD);

    const status = await getProbationStatus("user-1");

    expect(status).toMatchObject({ inProbation: false, tasksRemaining: 0 });
  });
});

describe("assignNextTask raises the gold rate during probation", () => {
  it("uses at least the probation floor for a brand-new trainer, even on a low-gold project", async () => {
    taskSubmissionCount.mockReset().mockResolvedValue(0);
    // Force the "wants gold" coin flip to land between the project's
    // configured 5% rate and the probation floor — only reachable as gold
    // if probation's floor, not the project's rate, actually won.
    const roll = PROBATION_GOLD_RATE / 2;
    vi.spyOn(Math, "random").mockReturnValue(roll);

    const result = await assignNextTask({ userId: "user-1", projectId: "proj-1" });

    expect(Math.random).toHaveBeenCalled();
    // roll < 0.05 (the project's own rate) is false, but roll < PROBATION_GOLD_RATE
    // is true — so the pick() call must have been made requesting a gold task first.
    expect(taskFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isGold: true }) })
    );
    expect(result).toEqual({ taskId: "task-1", wasGold: true });
  });

  it("falls back to the project's own rate once probation has cleared", async () => {
    taskSubmissionCount.mockReset().mockResolvedValue(PROBATION_TASK_THRESHOLD + 5);
    vi.spyOn(Math, "random").mockReturnValue(0.1);

    await assignNextTask({ userId: "user-1", projectId: "proj-1" });

    // 0.1 < 0.05 is false, and probation no longer raises the floor, so the
    // first pick must be for a non-gold task.
    expect(taskFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ isGold: false }) })
    );
  });
});
