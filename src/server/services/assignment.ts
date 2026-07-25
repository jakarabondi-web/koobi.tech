import { prisma } from "@/lib/db/prisma";
import { assertCanAccessAssignments } from "@/server/services/trainer-gate";
import { checkProjectEligibility } from "@/server/services/work-location";

export class AssignmentError extends Error {}

/**
 * Hands a trainer their next task on a project.
 *
 * Gold tasks are mixed in at the project's configured rate and are
 * indistinguishable from real work in everything the trainer receives —
 * that's the entire point. A benchmark a trainer can spot measures how well
 * they recognise benchmarks, not how well they work.
 */
export async function assignNextTask(params: {
  userId: string;
  projectId: string;
}): Promise<{ taskId: string; wasGold: boolean } | null> {
  await assertCanAccessAssignments(params.userId);

  const eligibility = await checkProjectEligibility({
    userId: params.userId,
    projectId: params.projectId,
  });
  if (!eligibility.eligible) throw new AssignmentError(eligibility.reasons.join(" "));

  const assignment = await prisma.projectAssignment.findUnique({
    where: { projectId_userId: { projectId: params.projectId, userId: params.userId } },
  });
  if (!assignment || assignment.status !== "ACTIVE") {
    throw new AssignmentError("You're not assigned to this project.");
  }

  const project = await prisma.project.findUniqueOrThrow({ where: { id: params.projectId } });

  // Decide gold-vs-real before looking at what's available, so the rate
  // reflects the configured policy rather than whatever happens to be in
  // the pool.
  const wantGold = Math.random() < project.goldTaskRate;

  const pick = async (isGold: boolean) =>
    prisma.task.findFirst({
      where: {
        projectId: params.projectId,
        isGold,
        status: "UNASSIGNED",
        assignments: { none: { userId: params.userId } },
      },
      orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    });

  // Fall back to the other pool rather than leaving a trainer idle.
  const task = (await pick(wantGold)) ?? (await pick(!wantGold));
  if (!task) return null;

  await prisma.$transaction([
    prisma.taskAssignment.create({
      data: {
        taskId: task.id,
        userId: params.userId,
        dueAt: new Date(Date.now() + 3 * 86_400_000),
      },
    }),
    prisma.task.update({
      where: { id: task.id },
      data: {
        // Overlapped tasks stay claimable by other trainers until the
        // required number of raters have it.
        status: project.consensusOverlap > 1 ? "UNASSIGNED" : "ASSIGNED",
      },
    }),
  ]);

  return { taskId: task.id, wasGold: task.isGold };
}

/** Gold coverage for a project, for the client and admin quality views. */
export async function getGoldCoverage(projectId: string) {
  const [total, gold, results] = await Promise.all([
    prisma.task.count({ where: { projectId } }),
    prisma.task.count({ where: { projectId, isGold: true } }),
    prisma.goldTaskResult.findMany({
      where: { goldTask: { projectId } },
      select: { passed: true },
    }),
  ]);

  return {
    totalTasks: total,
    goldTasks: gold,
    goldShare: total > 0 ? gold / total : 0,
    evaluated: results.length,
    passRate: results.length ? results.filter((r) => r.passed).length / results.length : null,
  };
}
