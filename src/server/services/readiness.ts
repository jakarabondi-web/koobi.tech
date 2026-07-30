import { prisma } from "@/lib/db/prisma";

/**
 * The post-approval readiness program.
 *
 * Qualification exams answer one question — "may this person work here at
 * all?" — with a single pass/fail bar. Readiness exams answer a different
 * one: "what is this trainer actually good at, and how good?" Every
 * readiness question is tagged with a skill area; graded responses roll up
 * into a per-skill profile, an overall score, and a tier, and trainers are
 * ranked against each other so work can be routed to the strongest people
 * in each skill.
 */

export type SkillScore = {
  skillArea: string;
  /** 0–1: points awarded / points possible across every graded response. */
  score: number;
  questionsGraded: number;
};

export type ReadinessTier = "EXPERT" | "ADVANCED" | "PROFICIENT" | "DEVELOPING";

export type SkillProfile = {
  skills: SkillScore[];
  /** Mean of the per-skill scores — null until at least one response is graded. */
  overall: number | null;
  tier: ReadinessTier | null;
  examsCompleted: number;
};

/**
 * Tier bars are deliberately spaced tighter at the top: the difference
 * between 0.85 and 0.95 matters for routing expert work; the difference
 * between 0.2 and 0.3 does not.
 */
export function tierFor(overall: number): ReadinessTier {
  if (overall >= 0.85) return "EXPERT";
  if (overall >= 0.7) return "ADVANCED";
  if (overall >= 0.55) return "PROFICIENT";
  return "DEVELOPING";
}

export const TIER_LABELS: Record<ReadinessTier, string> = {
  EXPERT: "Expert",
  ADVANCED: "Advanced",
  PROFICIENT: "Proficient",
  DEVELOPING: "Developing",
};

type GradedResponse = {
  pointsAwarded: number | null;
  question: { skillArea: string | null; points: number };
};

/**
 * Pure aggregation, separated from the queries so it can be unit-tested:
 * graded responses (pointsAwarded set — written answers count once a human
 * has scored them) grouped by skill area into 0–1 scores.
 */
export function aggregateSkillScores(responses: GradedResponse[]): SkillScore[] {
  const bySkill = new Map<string, { earned: number; possible: number; count: number }>();

  for (const r of responses) {
    if (r.pointsAwarded == null || !r.question.skillArea) continue;
    const bucket = bySkill.get(r.question.skillArea) ?? { earned: 0, possible: 0, count: 0 };
    bucket.earned += r.pointsAwarded;
    bucket.possible += r.question.points;
    bucket.count += 1;
    bySkill.set(r.question.skillArea, bucket);
  }

  return [...bySkill.entries()]
    .map(([skillArea, b]) => ({
      skillArea,
      score: b.possible > 0 ? b.earned / b.possible : 0,
      questionsGraded: b.count,
    }))
    .sort((a, b) => b.score - a.score);
}

export function profileFromScores(skills: SkillScore[], examsCompleted: number): SkillProfile {
  const overall =
    skills.length > 0 ? skills.reduce((sum, s) => sum + s.score, 0) / skills.length : null;
  return { skills, overall, tier: overall != null ? tierFor(overall) : null, examsCompleted };
}

/** The trainer's skill profile across every readiness exam they've taken. */
export async function getSkillProfile(userId: string): Promise<SkillProfile> {
  const attempts = await prisma.assessmentAttempt.findMany({
    where: {
      userId,
      assessment: { kind: "READINESS" },
      status: { in: ["SUBMITTED", "UNDER_REVIEW", "PASSED", "FAILED"] },
    },
    include: { responses: { include: { question: { select: { skillArea: true, points: true } } } } },
  });

  const responses = attempts.flatMap((a) => a.responses);
  const completed = attempts.filter((a) => a.status === "PASSED" || a.status === "FAILED").length;
  return profileFromScores(aggregateSkillScores(responses), completed);
}

/**
 * Readiness exams visible to an approved trainer, with their attempt state.
 * Domain-scoped the same way qualification exams are: their application's
 * domain plus the platform-wide "General assistant" track.
 */
export async function listReadinessForUser(userId: string) {
  const [application, assessments, attempts] = await Promise.all([
    prisma.application.findUnique({ where: { userId }, select: { domain: true } }),
    prisma.assessment.findMany({
      where: { isActive: true, kind: "READINESS" },
      orderBy: { title: "asc" },
    }),
    prisma.assessmentAttempt.findMany({
      where: { userId, assessment: { kind: "READINESS" } },
      orderBy: { startedAt: "desc" },
    }),
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

export type RankedTrainer = {
  userId: string;
  name: string;
  email: string;
  domain: string | null;
  overall: number;
  tier: ReadinessTier;
  topSkill: string | null;
  rank: number;
  /** Share of ranked trainers at or below this score, 0–100. */
  percentile: number;
};

/**
 * Every trainer with at least one graded readiness response, ranked by
 * overall skill score. This is the admin's routing view: who to hand the
 * hard work to, and what each person's strongest dimension is.
 */
export async function getTrainerRankings(): Promise<RankedTrainer[]> {
  const attempts = await prisma.assessmentAttempt.findMany({
    where: {
      assessment: { kind: "READINESS" },
      status: { in: ["SUBMITTED", "UNDER_REVIEW", "PASSED", "FAILED"] },
    },
    include: {
      responses: { include: { question: { select: { skillArea: true, points: true } } } },
      user: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          application: { select: { domain: true } },
        },
      },
    },
  });

  const byUser = new Map<string, { user: (typeof attempts)[number]["user"]; responses: GradedResponse[] }>();
  for (const attempt of attempts) {
    const entry = byUser.get(attempt.userId) ?? { user: attempt.user, responses: [] };
    entry.responses.push(...attempt.responses);
    byUser.set(attempt.userId, entry);
  }

  const scored = [...byUser.values()]
    .map(({ user, responses }) => {
      const skills = aggregateSkillScores(responses);
      const profile = profileFromScores(skills, 0);
      return { user, skills, overall: profile.overall };
    })
    .filter((s): s is typeof s & { overall: number } => s.overall != null)
    .sort((a, b) => b.overall - a.overall);

  return scored.map((s, index) => ({
    userId: s.user.id,
    name: `${s.user.firstName} ${s.user.lastName}`,
    email: s.user.email,
    domain: s.user.application?.domain ?? null,
    overall: s.overall,
    tier: tierFor(s.overall),
    topSkill: s.skills[0]?.skillArea ?? null,
    rank: index + 1,
    percentile: Math.round(((scored.length - index) / scored.length) * 100),
  }));
}
