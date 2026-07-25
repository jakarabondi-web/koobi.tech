import type { Export, Project, Task, TaskSubmission } from "@prisma/client";

/**
 * Explicit shapes for the public API.
 *
 * These are hand-written rather than spreading the Prisma row, so adding a
 * column to the database can never silently widen the public contract — or
 * leak an internal field like a budget or a trainer's identity.
 */

export function serializeProject(p: Project & { _count?: { tasks: number } }) {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    domain: p.domain,
    task_type: p.taskType,
    status: p.status,
    languages: p.languages,
    quality_threshold: p.qualityThreshold,
    gold_task_rate: p.goldTaskRate,
    consensus_overlap: p.consensusOverlap,
    pay_per_task_cents: p.payPerTaskCents,
    task_count: p._count?.tasks,
    created_at: p.createdAt.toISOString(),
    updated_at: p.updatedAt.toISOString(),
  };
}

export function serializeTask(t: Task) {
  return {
    id: t.id,
    project_id: t.projectId,
    external_ref: t.externalRef,
    status: t.status,
    // Whether a task is gold is deliberately exposed to the client that owns
    // it — it is hidden from trainers, not from the project owner.
    is_gold: t.isGold,
    payload: t.payload,
    created_at: t.createdAt.toISOString(),
    updated_at: t.updatedAt.toISOString(),
  };
}

type SubmissionRow = TaskSubmission & {
  task: Pick<Task, "id" | "projectId" | "externalRef" | "isGold">;
  reviews: {
    decision: string;
    createdAt: Date;
    scores: { category: string; score: number }[];
  }[];
};

/**
 * Note what is absent: `submittedById`. Clients buy evaluations, not the
 * identities of the people who produced them — expert identity shielding is
 * a stated guarantee of the platform, so the field never crosses this
 * boundary.
 */
export function serializeSubmission(s: SubmissionRow) {
  const decided = s.reviews.find((r) => r.decision === "APPROVED" || r.decision === "REJECTED");
  const scores = decided?.scores ?? [];
  const mean = scores.length
    ? scores.reduce((sum, sc) => sum + sc.score, 0) / scores.length
    : null;

  return {
    id: s.id,
    task_id: s.taskId,
    project_id: s.task.projectId,
    external_ref: s.task.externalRef,
    is_gold: s.task.isGold,
    content: s.content,
    version: s.version,
    duration_seconds: s.durationSeconds,
    review: decided
      ? {
          decision: decided.decision,
          score: mean,
          criteria: Object.fromEntries(scores.map((sc) => [sc.category, sc.score])),
          reviewed_at: decided.createdAt.toISOString(),
        }
      : null,
    submitted_at: s.submittedAt.toISOString(),
  };
}

export function serializeExport(e: Export & { dataset?: { name: string; projectId: string } }) {
  return {
    id: e.id,
    dataset_id: e.datasetId,
    dataset_name: e.dataset?.name,
    project_id: e.dataset?.projectId,
    format: e.format,
    status: e.status,
    // Null until a worker has produced the file. Polling this field, or
    // subscribing to the webhook, are both valid.
    file_url: e.fileUrl,
    created_at: e.createdAt.toISOString(),
    completed_at: e.completedAt?.toISOString() ?? null,
  };
}
