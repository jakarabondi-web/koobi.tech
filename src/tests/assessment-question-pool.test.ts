import { describe, expect, it, vi, beforeEach } from "vitest";

const assessmentFindUnique = vi.fn();
const attemptFindFirst = vi.fn();
const attemptFindUnique = vi.fn();
const attemptCount = vi.fn();
const attemptCreate = vi.fn();
const attemptUpdate = vi.fn();
const responseCreateMany = vi.fn();
const notificationCreate = vi.fn();
const transaction = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    assessment: { findUnique: (...a: unknown[]) => assessmentFindUnique(...a) },
    assessmentAttempt: {
      findFirst: (...a: unknown[]) => attemptFindFirst(...a),
      findUnique: (...a: unknown[]) => attemptFindUnique(...a),
      count: (...a: unknown[]) => attemptCount(...a),
      create: (...a: unknown[]) => attemptCreate(...a),
      update: (...a: unknown[]) => attemptUpdate(...a),
    },
    assessmentResponse: { createMany: (...a: unknown[]) => responseCreateMany(...a) },
    notification: { create: (...a: unknown[]) => notificationCreate(...a) },
    $transaction: (...a: unknown[]) => transaction(...a),
  },
}));

const { startAttempt, submitAttempt } = await import("@/server/services/assessments");

function question(id: string, type: "MULTIPLE_CHOICE" | "WRITTEN_RESPONSE") {
  return { id, type, order: Number(id) };
}

const SIX_MCQ_ONE_WRITTEN = [
  question("1", "MULTIPLE_CHOICE"),
  question("2", "MULTIPLE_CHOICE"),
  question("3", "MULTIPLE_CHOICE"),
  question("4", "MULTIPLE_CHOICE"),
  question("5", "MULTIPLE_CHOICE"),
  question("6", "MULTIPLE_CHOICE"),
  question("7", "WRITTEN_RESPONSE"),
];

beforeEach(() => {
  assessmentFindUnique.mockReset();
  attemptFindFirst.mockReset().mockResolvedValue(null); // no in-progress attempt to resume
  attemptCount.mockReset().mockResolvedValue(0);
  attemptCreate.mockReset().mockImplementation(({ data }: { data: Record<string, unknown> }) =>
    Promise.resolve({ id: "attempt-1", ...data })
  );
  attemptFindUnique.mockReset();
  attemptUpdate.mockReset().mockResolvedValue({});
  responseCreateMany.mockReset().mockResolvedValue({});
  notificationCreate.mockReset().mockResolvedValue({});
  transaction.mockReset().mockResolvedValue([]);
});

describe("assessment question pool is drawn, not served in full", () => {
  it("draws only 3 of the 6 multiple-choice questions, plus the written question", async () => {
    assessmentFindUnique.mockResolvedValue({
      id: "assess-1",
      isActive: true,
      maxAttempts: 2,
      cooldownHours: 72,
      timeLimitMins: null,
      questionsPerAttempt: 3,
      questions: SIX_MCQ_ONE_WRITTEN,
    });

    const { attempt } = await startAttempt({ userId: "user-1", assessmentId: "assess-1" });

    const selected: string[] = attempt.selectedQuestionIds;
    expect(selected).toHaveLength(4);

    const selectedQuestions = SIX_MCQ_ONE_WRITTEN.filter((q) => selected.includes(q.id));
    expect(selectedQuestions.filter((q) => q.type === "MULTIPLE_CHOICE")).toHaveLength(3);
    expect(selectedQuestions.filter((q) => q.type === "WRITTEN_RESPONSE")).toHaveLength(1);
    // The written question always makes it in — there's only one.
    expect(selected).toContain("7");
  });

  it("draws a different subset across repeated attempts (not the same 3 every time)", async () => {
    assessmentFindUnique.mockResolvedValue({
      id: "assess-1",
      isActive: true,
      maxAttempts: 50,
      cooldownHours: 0,
      timeLimitMins: null,
      questionsPerAttempt: 3,
      questions: SIX_MCQ_ONE_WRITTEN,
    });

    const draws = new Set<string>();
    for (let i = 0; i < 25; i++) {
      attemptFindFirst.mockResolvedValue(null);
      const { attempt } = await startAttempt({ userId: "user-1", assessmentId: "assess-1" });
      draws.add([...attempt.selectedQuestionIds].sort().join(","));
    }

    // With C(6,3) = 20 possible MCQ subsets, 25 draws landing on the exact
    // same combination every time would mean the bank isn't rotating at all.
    expect(draws.size).toBeGreaterThan(1);
  });

  it("never draws more MCQs than exist when the bank is smaller than the sample size", async () => {
    assessmentFindUnique.mockResolvedValue({
      id: "assess-1",
      isActive: true,
      maxAttempts: 2,
      cooldownHours: 72,
      timeLimitMins: null,
      questionsPerAttempt: 10,
      questions: [question("1", "MULTIPLE_CHOICE"), question("2", "MULTIPLE_CHOICE")],
    });

    const { attempt } = await startAttempt({ userId: "user-1", assessmentId: "assess-1" });

    expect(attempt.selectedQuestionIds).toHaveLength(2);
  });

  it("refuses to start a new attempt while the last one is still under human review", async () => {
    assessmentFindUnique.mockResolvedValue({
      id: "assess-1",
      isActive: true,
      maxAttempts: 2,
      cooldownHours: 72,
      timeLimitMins: null,
      questionsPerAttempt: 3,
      questions: SIX_MCQ_ONE_WRITTEN,
    });
    // First findFirst call: no IN_PROGRESS attempt to resume.
    // Second findFirst call: the prior attempt is UNDER_REVIEW.
    attemptFindFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: "attempt-0", status: "UNDER_REVIEW" });

    await expect(startAttempt({ userId: "user-1", assessmentId: "assess-1" })).rejects.toThrow(
      /still being reviewed/i
    );
    expect(attemptCreate).not.toHaveBeenCalled();
  });
});

describe("submitAttempt grades only the drawn subset", () => {
  it("scores against the 3 selected MCQs, ignoring the 3 not drawn for this attempt", async () => {
    // A trainee could answer every question in the full bank — including
    // ones they were never shown — if a stale client sent extra answers.
    // Only the drawn subset should count.
    const mcqQuestions = SIX_MCQ_ONE_WRITTEN.filter((q) => q.type === "MULTIPLE_CHOICE").map((q) => ({
      ...q,
      correctAnswer: "yes",
      points: 2,
      options: ["yes", "no"],
    }));
    attemptFindUnique.mockResolvedValue({
      id: "attempt-1",
      userId: "user-1",
      status: "IN_PROGRESS",
      expiresAt: null,
      selectedQuestionIds: ["1", "2", "3", "7"], // only these were drawn (3 MCQs + the written)
      assessment: {
        passThreshold: 0.5,
        questions: [...mcqQuestions, { id: "7", type: "WRITTEN_RESPONSE", points: 4 }],
      },
    });

    const answers = { "1": "yes", "2": "yes", "3": "no", "4": "yes", "5": "yes", "6": "yes" };
    const { score } = await submitAttempt({ userId: "user-1", attemptId: "attempt-1", answers });

    // If questions 4-6 had leaked into grading, all-correct answers there
    // would push the score toward 1; scoped correctly, 2 of 3 drawn MCQs
    // were answered "yes" (correct) => 2/3.
    expect(score).toBeCloseTo(2 / 3, 5);

    const [{ data: responses }] = responseCreateMany.mock.calls[0];
    expect(responses).toHaveLength(4); // 3 drawn MCQs + the 1 written question
    expect(responses.map((r: { questionId: string }) => r.questionId).sort()).toEqual(["1", "2", "3", "7"]);
  });
});
