import { prisma } from "@/lib/db/prisma";

/**
 * Recomputes a trainer's overall quality score from the two signals that
 * are hardest to game: accuracy on gold tasks (graded against a known
 * answer the trainer never sees coming) and reviewer decisions on their
 * real submissions.
 *
 * Without this, `TrainerProfile.qualityScore` was only ever set once, by
 * the seed — nothing kept it current, so the admin quality page's "flag
 * trainers under 75%" view had nothing live to flag. Called after every
 * review decision and every gold-task result, so drift shows up quickly
 * instead of sitting frozen at whatever a trainer scored on day one.
 */
export async function recomputeQualityScore(userId: string): Promise<number | null> {
  const [goldResults, submissions] = await Promise.all([
    prisma.goldTaskResult.findMany({
      where: { userId },
      orderBy: { evaluatedAt: "desc" },
      take: 40,
      select: { passed: true },
    }),
    prisma.taskSubmission.findMany({
      where: { submittedById: userId, task: { isGold: false } },
      orderBy: { submittedAt: "desc" },
      take: 40,
      select: {
        reviews: { select: { decision: true }, orderBy: { createdAt: "desc" }, take: 1 },
        adjudication: { select: { status: true, finalDecision: true } },
      },
    }),
  ]);

  const goldAccuracy = goldResults.length
    ? goldResults.filter((g) => g.passed).length / goldResults.length
    : null;

  // One outcome per submission — a lead reviewer's binding call overrides
  // the raw review decision, and a multi-reviewer submission shouldn't
  // count once per reviewer.
  const outcomes = submissions
    .map((s) =>
      s.adjudication?.status === "RESOLVED" && s.adjudication.finalDecision
        ? s.adjudication.finalDecision
        : (s.reviews[0]?.decision ?? null)
    )
    .filter((d): d is NonNullable<typeof d> => d != null);
  const approvalRate = outcomes.length
    ? outcomes.filter((d) => d === "APPROVED").length / outcomes.length
    : null;

  // Nothing to score yet — leave the field alone rather than writing a
  // meaningless 0 over whatever the trainer was seeded or last scored at.
  if (goldAccuracy == null && approvalRate == null) return null;

  // Gold accuracy is weighted higher: it's graded against a known answer,
  // where review approval also reflects how lenient or strict the
  // reviewer who happened to pick up the submission was.
  const overall =
    goldAccuracy != null && approvalRate != null
      ? 0.6 * goldAccuracy + 0.4 * approvalRate
      : (goldAccuracy ?? approvalRate)!;

  const profile = await prisma.trainerProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!profile) return null;

  await prisma.$transaction([
    prisma.trainerProfile.update({ where: { userId }, data: { qualityScore: overall } }),
    prisma.qualityMetric.create({
      data: { trainerId: profile.id, category: "overall", score: overall },
    }),
  ]);

  return overall;
}
