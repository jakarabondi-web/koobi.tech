import { prisma } from "@/lib/db/prisma";
import { assertCanAccessAssignments } from "@/server/services/trainer-gate";
import { checkProjectEligibility } from "@/server/services/work-location";

export class AssignmentError extends Error {}

/**
 * Approves a trainer's application into a real, task-bearing assignment.
 *
 * Reactivates a previously REMOVED assignment rather than erroring on the
 * unique constraint — a trainer who left a project and later reapplies
 * shouldn't be blocked by their own history.
 */
export async function matchApplication(params: { applicationId: string; decidedBy: string }) {
  const application = await prisma.projectApplication.findUnique({ where: { id: params.applicationId } });
  if (!application) throw new AssignmentError("That application no longer exists.");
  if (application.status !== "APPLIED") {
    throw new AssignmentError("That application has already been decided.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.projectApplication.update({
      where: { id: params.applicationId },
      data: { status: "MATCHED", decidedAt: new Date() },
    });

    await tx.projectAssignment.upsert({
      where: { projectId_userId: { projectId: application.projectId, userId: application.userId } },
      create: { projectId: application.projectId, userId: application.userId, status: "ACTIVE" },
      update: { status: "ACTIVE", removedAt: null },
    });

    await tx.auditLog.create({
      data: {
        actorId: params.decidedBy,
        action: "project_application.matched",
        entityType: "ProjectApplication",
        entityId: params.applicationId,
      },
    });

    await tx.notification.create({
      data: {
        userId: application.userId,
        type: "application_matched",
        title: "You've been matched to a project",
        body: "You can start pulling tasks now.",
        link: `/trainer/projects/${application.projectId}`,
      },
    });

    return updated;
  });
}

/** Declines a trainer's application to a project. Record-only — no assignment is touched. */
export async function rejectApplication(params: { applicationId: string; decidedBy: string; reason?: string }) {
  const application = await prisma.projectApplication.findUnique({ where: { id: params.applicationId } });
  if (!application) throw new AssignmentError("That application no longer exists.");
  if (application.status !== "APPLIED") {
    throw new AssignmentError("That application has already been decided.");
  }

  return prisma.$transaction(async (tx) => {
    const updated = await tx.projectApplication.update({
      where: { id: params.applicationId },
      data: { status: "REJECTED", decidedAt: new Date() },
    });

    await tx.auditLog.create({
      data: {
        actorId: params.decidedBy,
        action: "project_application.rejected",
        entityType: "ProjectApplication",
        entityId: params.applicationId,
        metadata: params.reason ? { reason: params.reason } : undefined,
      },
    });

    await tx.notification.create({
      data: {
        userId: application.userId,
        type: "application_rejected",
        title: "Application not matched",
        body: params.reason || "This project wasn't a match this time. Keep an eye on the marketplace for others.",
        link: "/trainer/projects",
      },
    });

    return updated;
  });
}

/**
 * A newly-approved trainer has passed the qualification exam, but that's
 * one test on one day — it says nothing about how they'll actually perform
 * across real, varied work. Until they've cleared this many submissions,
 * they get checked against gold tasks more often than the project's
 * configured rate, regardless of how low that rate is set.
 */
export const PROBATION_TASK_THRESHOLD = 20;
/** Floor on gold-task rate while a trainer is in probation. */
export const PROBATION_GOLD_RATE = 0.25;

/** Whether a trainer is still in their probation window, and how far along. */
export async function getProbationStatus(userId: string) {
  const tasksCompleted = await prisma.taskSubmission.count({ where: { submittedById: userId } });
  return {
    inProbation: tasksCompleted < PROBATION_TASK_THRESHOLD,
    tasksCompleted,
    tasksRemaining: Math.max(0, PROBATION_TASK_THRESHOLD - tasksCompleted),
    threshold: PROBATION_TASK_THRESHOLD,
  };
}

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
  const probation = await getProbationStatus(params.userId);

  // Decide gold-vs-real before looking at what's available, so the rate
  // reflects the configured policy rather than whatever happens to be in
  // the pool. A trainer still in probation gets checked at least as often
  // as the probation floor, even on a project configured with a lower
  // gold-task rate.
  const goldRate = probation.inProbation
    ? Math.max(project.goldTaskRate, PROBATION_GOLD_RATE)
    : project.goldTaskRate;
  const wantGold = Math.random() < goldRate;

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
