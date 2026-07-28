import { describe, expect, it, vi, beforeEach } from "vitest";

const taskSubmissionFindMany = vi.fn();
const riskFlagCreate = vi.fn();
const riskFlagFindMany = vi.fn();
const adjudicationFindUnique = vi.fn();
const adjudicationCreate = vi.fn();
const taskUpdate = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    taskSubmission: { findMany: (...a: unknown[]) => taskSubmissionFindMany(...a) },
    riskFlag: {
      create: (...a: unknown[]) => riskFlagCreate(...a),
      findMany: (...a: unknown[]) => riskFlagFindMany(...a),
    },
    adjudication: {
      findUnique: (...a: unknown[]) => adjudicationFindUnique(...a),
      create: (...a: unknown[]) => adjudicationCreate(...a),
    },
    task: { update: (...a: unknown[]) => taskUpdate(...a) },
  },
}));

const { checkSubmissionSimilarity, getOpenSimilarityFlag } = await import("@/server/services/plagiarism");

const LONG_JUSTIFICATION =
  "Response A is preferred because it directly follows the instruction to summarize in three sentences " +
  "while response B ignores the length constraint entirely and rambles on for two paragraphs instead";

beforeEach(() => {
  taskSubmissionFindMany.mockReset();
  riskFlagCreate.mockReset();
  riskFlagFindMany.mockReset();
  adjudicationFindUnique.mockReset().mockResolvedValue(null);
  adjudicationCreate.mockReset().mockResolvedValue({ id: "adj-1" });
  taskUpdate.mockReset();
});

describe("checkSubmissionSimilarity", () => {
  it("skips very short justifications — too noisy to compare reliably", async () => {
    const result = await checkSubmissionSimilarity({
      submissionId: "sub-new",
      taskId: "task-1",
      submittedById: "user-a",
      justification: "Response A is better.",
    });

    expect(result).toBeNull();
    expect(taskSubmissionFindMany).not.toHaveBeenCalled();
  });

  it("returns null when there's nothing else to compare against", async () => {
    taskSubmissionFindMany.mockResolvedValue([]);

    const result = await checkSubmissionSimilarity({
      submissionId: "sub-new",
      taskId: "task-1",
      submittedById: "user-a",
      justification: LONG_JUSTIFICATION,
    });

    expect(result).toBeNull();
    expect(riskFlagCreate).not.toHaveBeenCalled();
  });

  it("does not flag genuinely different justifications", async () => {
    taskSubmissionFindMany.mockResolvedValue([
      {
        id: "sub-other",
        submittedById: "user-b",
        content: {
          justification:
            "I chose response B since it correctly cites the source material and response A hallucinates a statistic that does not appear anywhere in the provided context",
        },
      },
    ]);

    const result = await checkSubmissionSimilarity({
      submissionId: "sub-new",
      taskId: "task-1",
      submittedById: "user-a",
      justification: LONG_JUSTIFICATION,
    });

    expect(result).toBeNull();
    expect(riskFlagCreate).not.toHaveBeenCalled();
  });

  it("flags a near-identical justification from a different trainer on the same task", async () => {
    taskSubmissionFindMany.mockResolvedValue([
      { id: "sub-other", submittedById: "user-b", content: { justification: LONG_JUSTIFICATION } },
    ]);
    riskFlagCreate.mockResolvedValue({ id: "flag-1" });

    const result = await checkSubmissionSimilarity({
      submissionId: "sub-new",
      taskId: "task-1",
      submittedById: "user-a",
      justification: LONG_JUSTIFICATION,
    });

    expect(result).not.toBeNull();
    expect(result!.matchedUserId).toBe("user-b");
    expect(result!.similarity).toBeGreaterThan(0.6);

    expect(riskFlagCreate).toHaveBeenCalledTimes(1);
    const call = riskFlagCreate.mock.calls[0][0];
    expect(call.data.userId).toBe("user-a");
    expect(call.data.signal).toBe("plagiarism_suspected");
    expect(call.data.severity).toBe("high");
    expect(call.data.details.matchedUserId).toBe("user-b");
  });

  it("routes a high-severity match straight to adjudication, out of ordinary peer review", async () => {
    taskSubmissionFindMany.mockResolvedValue([
      { id: "sub-other", submittedById: "user-b", content: { justification: LONG_JUSTIFICATION } },
    ]);
    riskFlagCreate.mockResolvedValue({ id: "flag-1" });

    await checkSubmissionSimilarity({
      submissionId: "sub-new",
      taskId: "task-1",
      submittedById: "user-a",
      justification: LONG_JUSTIFICATION,
    });

    expect(adjudicationCreate).toHaveBeenCalledTimes(1);
    expect(adjudicationCreate.mock.calls[0][0].data).toEqual(
      expect.objectContaining({ submissionId: "sub-new", reason: "plagiarism_suspected" })
    );
    expect(taskUpdate).toHaveBeenCalledWith({ where: { id: "task-1" }, data: { status: "ESCALATED" } });
  });

  it("leaves a medium-severity match in ordinary peer review — only a high-confidence match escalates", async () => {
    // Shares its first 19 of 22 words with the original justification (~71%
    // shingle overlap — inside the medium band, below the 85% "high" bar)
    // and then diverges completely, unlike the near-verbatim copy above.
    const original = "the quick brown fox jumps over the lazy dog again and again while the cat watches quietly from the window sill nearby";
    const partialMatch = "the quick brown fox jumps over the lazy dog again and again while the cat watches quietly from the zzz yyy xxx";

    taskSubmissionFindMany.mockResolvedValue([
      { id: "sub-other", submittedById: "user-b", content: { justification: original } },
    ]);
    riskFlagCreate.mockResolvedValue({ id: "flag-1" });

    const result = await checkSubmissionSimilarity({
      submissionId: "sub-new",
      taskId: "task-1",
      submittedById: "user-a",
      justification: partialMatch,
    });

    expect(result).not.toBeNull();
    expect(result!.similarity).toBeGreaterThanOrEqual(0.6);
    expect(result!.similarity).toBeLessThan(0.85);
    expect(riskFlagCreate).toHaveBeenCalledTimes(1);
    expect(riskFlagCreate.mock.calls[0][0].data.severity).toBe("medium");
    expect(adjudicationCreate).not.toHaveBeenCalled();
    expect(taskUpdate).not.toHaveBeenCalled();
  });

  it("never compares a submission against the same trainer's other work", async () => {
    taskSubmissionFindMany.mockResolvedValue([]);

    await checkSubmissionSimilarity({
      submissionId: "sub-new",
      taskId: "task-1",
      submittedById: "user-a",
      justification: LONG_JUSTIFICATION,
    });

    expect(taskSubmissionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ submittedById: { not: "user-a" } }),
      })
    );
  });
});

describe("getOpenSimilarityFlag", () => {
  it("returns null when no open flag references this submission", async () => {
    riskFlagFindMany.mockResolvedValue([
      { id: "flag-1", severity: "medium", details: { submissionId: "some-other-submission" } },
    ]);

    const result = await getOpenSimilarityFlag("sub-new");
    expect(result).toBeNull();
  });

  it("surfaces severity and similarity without the matched trainer's identity", async () => {
    riskFlagFindMany.mockResolvedValue([
      {
        id: "flag-1",
        severity: "high",
        details: { submissionId: "sub-new", matchedUserId: "user-b", similarity: 0.91 },
      },
    ]);

    const result = await getOpenSimilarityFlag("sub-new");

    expect(result).toEqual({ severity: "high", similarity: 0.91 });
    expect(result).not.toHaveProperty("matchedUserId");
  });
});
