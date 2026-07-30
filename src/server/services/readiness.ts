import { prisma } from "@/lib/db/prisma";

export class ReadinessError extends Error {}

/**
 * The mandatory post-approval Readiness Program.
 *
 * Once a trainer is approved, they still can't accept paid work until they
 * complete every calibration task tagged to their domain: read a prompt and
 * two candidate responses, pick the better one, then see the correct choice
 * and a short explanation immediately — training, not just gatekeeping. The
 * per-task result also builds the trainer's per-skill UserSkill level, which
 * is what lets the platform actually say what someone is good at, rather
 * than tracking one aggregate quality number.
 */

export type ReadinessTaskView = {
  id: string;
  skill: string;
  title: string;
  prompt: string;
  responseA: string;
  responseB: string;
  order: number;
  completed: boolean;
  /** Only set once the trainee has submitted this task. */
  result?: { choice: string; correct: boolean; correctChoice: string; guidance: string };
};

async function domainForUser(userId: string): Promise<string | null> {
  const application = await prisma.application.findUnique({ where: { userId }, select: { domain: true } });
  return application?.domain ?? null;
}

/** The task set for the trainer's domain, with their per-task progress. */
export async function listReadinessTasksForUser(userId: string): Promise<ReadinessTaskView[]> {
  const domain = await domainForUser(userId);
  if (!domain) return [];

  const [tasks, attempts] = await Promise.all([
    prisma.readinessTask.findMany({
      where: { domain, isActive: true },
      include: { skill: true },
      orderBy: [{ skillId: "asc" }, { order: "asc" }],
    }),
    prisma.readinessAttempt.findMany({ where: { userId } }),
  ]);

  const byTaskId = new Map(attempts.map((a) => [a.readinessTaskId, a]));

  return tasks.map((t) => {
    const attempt = byTaskId.get(t.id);
    return {
      id: t.id,
      skill: t.skill.name,
      title: t.title,
      prompt: t.prompt,
      responseA: t.responseA,
      responseB: t.responseB,
      order: t.order,
      completed: Boolean(attempt),
      result: attempt
        ? { choice: attempt.choice, correct: attempt.correct, correctChoice: t.correctChoice, guidance: t.guidance }
        : undefined,
    };
  });
}

/** Whether every readiness task for the trainer's domain has an attempt. */
export async function isReadinessComplete(userId: string): Promise<boolean> {
  const domain = await domainForUser(userId);
  if (!domain) return false;

  const [taskIds, attemptCount] = await Promise.all([
    prisma.readinessTask.findMany({ where: { domain, isActive: true }, select: { id: true } }),
    prisma.readinessAttempt.count({ where: { userId } }),
  ]);
  if (taskIds.length === 0) return true; // No content configured for this domain — nothing to block on.

  const completed = await prisma.readinessAttempt.count({
    where: { userId, readinessTaskId: { in: taskIds.map((t) => t.id) } },
  });
  return completed >= taskIds.length && attemptCount >= taskIds.length;
}

/**
 * Records a trainee's choice on one calibration task and returns the answer
 * key immediately — the whole point of the program is the feedback loop.
 * Once every task in the domain is done, finalizes per-skill UserSkill
 * levels and QualityMetric rows from the accumulated results.
 */
export async function submitReadinessResponse(params: {
  userId: string;
  taskId: string;
  choice: "A" | "B";
}) {
  const task = await prisma.readinessTask.findUnique({
    where: { id: params.taskId },
    include: { skill: true },
  });
  if (!task || !task.isActive) throw new ReadinessError("Task not found.");

  const domain = await domainForUser(params.userId);
  if (domain !== task.domain) throw new ReadinessError("This task isn't part of your readiness program.");

  const existing = await prisma.readinessAttempt.findUnique({
    where: { userId_readinessTaskId: { userId: params.userId, readinessTaskId: task.id } },
  });
  if (existing) {
    return {
      choice: existing.choice,
      correct: existing.correct,
      correctChoice: task.correctChoice,
      guidance: task.guidance,
    };
  }

  const correct = params.choice === task.correctChoice;

  await prisma.readinessAttempt.create({
    data: { userId: params.userId, readinessTaskId: task.id, choice: params.choice, correct },
  });

  if (await isReadinessComplete(params.userId)) {
    await finalizeReadiness(params.userId, domain!);
  }

  return { choice: params.choice, correct, correctChoice: task.correctChoice, guidance: task.guidance };
}

/**
 * Rolls up completed attempts into a level 1-5 per skill and a QualityMetric
 * row, so the trainer's skill profile exists as soon as the program is
 * finished rather than needing a separate offline job to compute it.
 */
async function finalizeReadiness(userId: string, domain: string) {
  const trainerProfile = await prisma.trainerProfile.findUnique({ where: { userId }, select: { id: true } });
  if (!trainerProfile) return;

  const attempts = await prisma.readinessAttempt.findMany({
    where: { userId, readinessTask: { domain } },
    include: { readinessTask: { include: { skill: true } } },
  });

  const bySkill = new Map<string, { skillId: string; skillName: string; correct: number; total: number }>();
  for (const a of attempts) {
    const key = a.readinessTask.skillId;
    const entry = bySkill.get(key) ?? { skillId: key, skillName: a.readinessTask.skill.name, correct: 0, total: 0 };
    entry.total += 1;
    if (a.correct) entry.correct += 1;
    bySkill.set(key, entry);
  }

  for (const { skillId, skillName, correct, total } of bySkill.values()) {
    const accuracy = total > 0 ? correct / total : 0;
    const level = Math.min(5, Math.max(1, Math.round(accuracy * 4) + 1));

    await prisma.userSkill.upsert({
      where: { trainerId_skillId: { trainerId: trainerProfile.id, skillId } },
      update: { level },
      create: { trainerId: trainerProfile.id, skillId, level },
    });

    await prisma.qualityMetric.create({
      data: { trainerId: trainerProfile.id, category: skillName, score: accuracy },
    });
  }
}
