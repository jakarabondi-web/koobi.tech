import { prisma } from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";

export class AssessmentError extends Error {}

/**
 * Draws this attempt's question set from the assessment's full bank: a
 * random sample of the auto-gradable questions (`questionsPerAttempt`,
 * clamped to the bank), plus every written-response question (there's
 * rarely more than one, and free-text answers resist naive answer-sharing
 * far better than a fixed multiple-choice key does).
 *
 * Fixed at start and stored on the attempt — the whole bank existing only
 * to be served in full, every time, is what makes a fixed set of questions
 * something people share instead of study for.
 */
function drawQuestionPool(
  questions: { id: string; type: string }[],
  questionsPerAttempt: number
): string[] {
  const autoGradable = questions.filter((q) => q.type === "MULTIPLE_CHOICE" || q.type === "RANKING");
  const written = questions.filter((q) => q.type === "WRITTEN_RESPONSE");

  const shuffled = shuffle(autoGradable);
  const sample = shuffled.slice(0, Math.min(Math.max(questionsPerAttempt, 1), shuffled.length));

  return [...sample, ...written].map((q) => q.id);
}

/**
 * Starts (or resumes) an attempt.
 *
 * Correct answers are never included in what this returns — they stay
 * server-side so the assessment can't be solved by reading the page source.
 */
export async function startAttempt(params: { userId: string; assessmentId: string }) {
  const assessment = await prisma.assessment.findUnique({
    where: { id: params.assessmentId },
    include: { questions: { orderBy: { order: "asc" } } },
  });
  if (!assessment || !assessment.isActive) throw new AssessmentError("Assessment unavailable.");

  const existing = await prisma.assessmentAttempt.findFirst({
    where: { userId: params.userId, assessmentId: params.assessmentId, status: "IN_PROGRESS" },
  });
  if (existing) return { attempt: existing, assessment };

  const pendingReview = await prisma.assessmentAttempt.findFirst({
    where: { userId: params.userId, assessmentId: params.assessmentId, status: "UNDER_REVIEW" },
  });
  if (pendingReview) {
    throw new AssessmentError(
      "Your last attempt is still being reviewed. You'll be able to retake this once a reviewer has scored your written answers."
    );
  }

  const priorAttempts = await prisma.assessmentAttempt.count({
    where: {
      userId: params.userId,
      assessmentId: params.assessmentId,
      status: { in: ["PASSED", "FAILED", "SUBMITTED", "UNDER_REVIEW"] },
    },
  });

  if (priorAttempts >= assessment.maxAttempts) {
    throw new AssessmentError("You've used all of your attempts for this assessment.");
  }

  // Cooling-off period after a failure discourages brute-forcing the bank.
  const lastFailure = await prisma.assessmentAttempt.findFirst({
    where: { userId: params.userId, assessmentId: params.assessmentId, status: "FAILED" },
    orderBy: { submittedAt: "desc" },
  });
  if (lastFailure?.submittedAt) {
    const readyAt = lastFailure.submittedAt.getTime() + assessment.cooldownHours * 3_600_000;
    if (Date.now() < readyAt) {
      throw new AssessmentError(
        `You can retake this assessment after ${new Date(readyAt).toLocaleString()}.`
      );
    }
  }

  const attempt = await prisma.assessmentAttempt.create({
    data: {
      userId: params.userId,
      assessmentId: params.assessmentId,
      status: "IN_PROGRESS",
      startedAt: new Date(),
      expiresAt: assessment.timeLimitMins
        ? new Date(Date.now() + assessment.timeLimitMins * 60_000)
        : null,
      selectedQuestionIds: drawQuestionPool(assessment.questions, assessment.questionsPerAttempt),
    },
  });

  return { attempt, assessment };
}

/**
 * Grades a submission.
 *
 * Auto-gradable question types are scored immediately; free-text answers are
 * routed to a human, because an assessment that only measures what a regex
 * can check selects for the wrong thing.
 */
export async function submitAttempt(params: {
  userId: string;
  attemptId: string;
  answers: Record<string, string>;
}) {
  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: params.attemptId },
    include: { assessment: { include: { questions: true } } },
  });

  if (!attempt || attempt.userId !== params.userId) throw new AssessmentError("Attempt not found.");
  if (attempt.status !== "IN_PROGRESS") throw new AssessmentError("This attempt is already submitted.");
  if (attempt.expiresAt && attempt.expiresAt < new Date()) {
    await prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: { status: "EXPIRED", submittedAt: new Date() },
    });
    throw new AssessmentError("Time expired for this attempt.");
  }

  // Grade only the subset actually drawn for this attempt — falling back to
  // the full bank for attempts started before question pooling existed.
  const questions =
    attempt.selectedQuestionIds.length > 0
      ? attempt.assessment.questions.filter((q) => attempt.selectedQuestionIds.includes(q.id))
      : attempt.assessment.questions;
  let earned = 0;
  let autoGradablePoints = 0;
  let needsManualReview = false;

  const responses = questions.map((q) => {
    const given = params.answers[q.id] ?? "";
    const autoGradable = q.type === "MULTIPLE_CHOICE" || q.type === "RANKING";

    if (!autoGradable) {
      needsManualReview = true;
      return { questionId: q.id, answer: given, isCorrect: null, pointsAwarded: null };
    }

    autoGradablePoints += q.points;
    const correct = String(q.correctAnswer ?? "");
    const isCorrect = given.trim() === correct.trim();
    if (isCorrect) earned += q.points;

    return {
      questionId: q.id,
      answer: given,
      isCorrect,
      pointsAwarded: isCorrect ? q.points : 0,
    };
  });

  const score = autoGradablePoints > 0 ? earned / autoGradablePoints : 0;
  const passedAuto = score >= attempt.assessment.passThreshold;

  // Failing the auto-graded portion is decisive; passing it still needs a
  // human to look at the written answers before the attempt counts as passed.
  const status = !passedAuto ? "FAILED" : needsManualReview ? "UNDER_REVIEW" : "PASSED";

  await prisma.$transaction([
    prisma.assessmentResponse.createMany({
      data: responses.map((r) => ({ ...r, attemptId: attempt.id })),
    }),
    prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: { status, score, submittedAt: new Date() },
    }),
    prisma.notification.create({
      data: {
        userId: params.userId,
        type: "assessment_submitted",
        title:
          status === "PASSED"
            ? "Assessment passed"
            : status === "FAILED"
              ? "Assessment not passed"
              : "Assessment submitted for review",
        body:
          status === "UNDER_REVIEW"
            ? "Your written answers are being reviewed. We'll let you know shortly."
            : `You scored ${Math.round(score * 100)}%.`,
        link: "/trainer/assessments",
      },
    }),
  ]);

  return { status, score };
}

/**
 * Assessments the trainer can see, with their attempt state.
 *
 * Scoped to the domain they actually applied under — the application form
 * tells them "this determines which qualification assessment you'll take",
 * so showing all eleven regardless of domain made that a lie for anyone
 * outside Software engineering. "General assistant" stays visible to
 * everyone as the platform-wide fallback, and any assessment they've
 * already attempted stays visible too, so a domain change or admin edit
 * never hides a trainee's own history.
 */
export async function listAssessmentsForUser(userId: string) {
  const [application, assessments, attempts] = await Promise.all([
    prisma.application.findUnique({ where: { userId }, select: { domain: true } }),
    // Qualification only — readiness exams live on /trainer/readiness,
    // after approval, and would be confusing noise during onboarding.
    prisma.assessment.findMany({
      where: { isActive: true, kind: "QUALIFICATION" },
      orderBy: { title: "asc" },
    }),
    prisma.assessmentAttempt.findMany({ where: { userId }, orderBy: { startedAt: "desc" } }),
  ]);

  const attemptedIds = new Set(attempts.map((t) => t.assessmentId));
  const relevant = assessments.filter(
    (a) => a.domain === application?.domain || a.domain === "General assistant" || attemptedIds.has(a.id)
  );

  return relevant.map((a) => {
    const mine = attempts.filter((t) => t.assessmentId === a.id);
    const best = mine.find((t) => t.status === "PASSED") ?? mine[0] ?? null;
    return {
      assessment: a,
      attempt: best,
      attemptsUsed: mine.filter((t) => t.status !== "IN_PROGRESS").length,
    };
  });
}
