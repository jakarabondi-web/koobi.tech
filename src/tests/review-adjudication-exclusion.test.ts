import { describe, expect, it, vi, beforeEach } from "vitest";

const taskSubmissionFindMany = vi.fn();
const taskSubmissionFindUnique = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    taskSubmission: {
      findMany: (...a: unknown[]) => taskSubmissionFindMany(...a),
      findUnique: (...a: unknown[]) => taskSubmissionFindUnique(...a),
    },
  },
}));
// reviews.ts also imports these for submitReview, unused by the two
// functions under test here but required for the module to load.
vi.mock("@/server/services/adjudication", () => ({ openAdjudication: vi.fn() }));
vi.mock("@/server/services/quality", () => ({ recomputeQualityScore: vi.fn() }));

const { getReviewQueue, loadSubmissionForReview, ReviewError } = await import("@/server/services/reviews");

beforeEach(() => {
  taskSubmissionFindMany.mockReset();
  taskSubmissionFindUnique.mockReset();
});

describe("getReviewQueue", () => {
  it("excludes submissions that already have an open adjudication", async () => {
    taskSubmissionFindMany.mockResolvedValue([]);

    await getReviewQueue("reviewer-1");

    expect(taskSubmissionFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: expect.objectContaining({ adjudication: null }) })
    );
  });
});

describe("loadSubmissionForReview", () => {
  function submission(overrides: Record<string, unknown> = {}) {
    return {
      id: "sub-1",
      submittedById: "user-submitter",
      version: 1,
      content: {},
      durationSeconds: 60,
      submittedAt: new Date(),
      reviews: [],
      task: { goldTask: null },
      adjudication: null,
      ...overrides,
    };
  }

  it("refuses a submission that's been escalated to adjudication, even via a direct link", async () => {
    taskSubmissionFindUnique.mockResolvedValue(
      submission({ adjudication: { id: "adj-1", status: "PENDING" } })
    );

    await expect(loadSubmissionForReview("sub-1", "reviewer-1")).rejects.toThrow(
      /under adjudication, not ordinary review/i
    );
  });

  it("still refuses self-review before checking adjudication status", async () => {
    taskSubmissionFindUnique.mockResolvedValue(submission({ submittedById: "reviewer-1" }));

    await expect(loadSubmissionForReview("sub-1", "reviewer-1")).rejects.toThrow(ReviewError);
  });

  it("allows an ordinary submission with no open adjudication through", async () => {
    taskSubmissionFindUnique.mockResolvedValue(submission());

    const loaded = await loadSubmissionForReview("sub-1", "reviewer-1");
    expect(loaded.id).toBe("sub-1");
  });
});
