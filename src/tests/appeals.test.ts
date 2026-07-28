import { describe, expect, it, vi, beforeEach } from "vitest";

const reviewFindUnique = vi.fn();
const qualityAppealFindFirst = vi.fn();
const qualityAppealCreate = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    review: { findUnique: (...a: unknown[]) => reviewFindUnique(...a) },
    qualityAppeal: {
      findFirst: (...a: unknown[]) => qualityAppealFindFirst(...a),
      create: (...a: unknown[]) => qualityAppealCreate(...a),
    },
  },
}));

const { submitAppeal, AppealError } = await import("@/server/services/appeals");

const SUBMITTER = "user-submitter";
const OTHER = "user-other";

function review() {
  return {
    id: "review-1",
    submissionId: "sub-1",
    decision: "REJECTED",
    submission: { id: "sub-1", submittedById: SUBMITTER },
  };
}

beforeEach(() => {
  reviewFindUnique.mockReset();
  qualityAppealFindFirst.mockReset();
  qualityAppealCreate.mockReset();
});

describe("submitAppeal", () => {
  it("refuses when the review doesn't exist", async () => {
    reviewFindUnique.mockResolvedValue(null);

    await expect(
      submitAppeal({ userId: SUBMITTER, reviewId: "missing", reason: "This review is wrong." })
    ).rejects.toThrow(AppealError);
  });

  it("refuses to let someone appeal a review on a submission that isn't theirs", async () => {
    reviewFindUnique.mockResolvedValue(review());

    await expect(
      submitAppeal({ userId: OTHER, reviewId: "review-1", reason: "This isn't even my submission." })
    ).rejects.toThrow(/your own submissions/i);

    expect(qualityAppealCreate).not.toHaveBeenCalled();
  });

  it("refuses a second open appeal on the same review", async () => {
    reviewFindUnique.mockResolvedValue(review());
    qualityAppealFindFirst.mockResolvedValue({ id: "appeal-existing", status: "OPEN" });

    await expect(
      submitAppeal({ userId: SUBMITTER, reviewId: "review-1", reason: "Trying again." })
    ).rejects.toThrow(/already have an open appeal/i);

    expect(qualityAppealCreate).not.toHaveBeenCalled();
  });

  it("creates an appeal when the submitter appeals their own review with no open appeal yet", async () => {
    reviewFindUnique.mockResolvedValue(review());
    qualityAppealFindFirst.mockResolvedValue(null);
    qualityAppealCreate.mockResolvedValue({ id: "appeal-new" });

    await submitAppeal({ userId: SUBMITTER, reviewId: "review-1", reason: "The reviewer missed context." });

    expect(qualityAppealCreate).toHaveBeenCalledWith({
      data: {
        userId: SUBMITTER,
        reviewId: "review-1",
        submissionId: "sub-1",
        reason: "The reviewer missed context.",
      },
    });
  });
});
