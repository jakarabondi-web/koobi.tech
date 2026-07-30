"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import type { Prisma } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { assertCanAccessAssignments, GateError } from "@/server/services/trainer-gate";
import { checkSubmissionSimilarity } from "@/server/services/plagiarism";
import {
  customResponseText,
  parseCustomSchema,
  validateCustomResponses,
} from "@/lib/tasks/custom-schema";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

const submitSchema = z.object({
  taskId: z.string().uuid(),
  preferred: z.enum(["A", "B"]),
  confidence: z.coerce.number().int().min(1).max(5),
  justification: z.string().min(20, "Explain your choice in at least 20 characters."),
  durationSeconds: z.coerce.number().int().min(0),
});

export async function submitTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  try {
    await assertCanAccessAssignments(session.user.id);
  } catch (err) {
    if (err instanceof GateError) return { status: "error", message: err.message };
    throw err;
  }

  const parsed = submitSchema.safeParse({
    taskId: formData.get("taskId"),
    preferred: formData.get("preferred"),
    confidence: formData.get("confidence"),
    justification: formData.get("justification"),
    durationSeconds: formData.get("durationSeconds"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check your submission." };
  }

  const { taskId, preferred, confidence, justification, durationSeconds } = parsed.data;

  // The trainer must actually hold this assignment — never trust the task id
  // from the form alone.
  const assignment = await prisma.taskAssignment.findUnique({
    where: { taskId_userId: { taskId, userId: session.user.id } },
    include: { task: true },
  });
  if (!assignment) return { status: "error", message: "This task isn't assigned to you." };
  if (assignment.completedAt) return { status: "error", message: "You've already submitted this task." };

  const scores: Record<string, number> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("score_")) scores[key.slice(6)] = Number(value);
  }

  const flags = {
    safety: formData.get("flag_safety") === "on",
    factuality: formData.get("flag_factuality") === "on",
    citation: formData.get("flag_citation") === "on",
  };

  const priorVersions = await prisma.taskSubmission.count({ where: { taskId } });

  const [created] = await prisma.$transaction([
    prisma.taskSubmission.create({
      data: {
        taskId,
        submittedById: session.user.id,
        content: { preferred, confidence, justification, scores, flags },
        durationSeconds,
        version: priorVersions + 1,
      },
    }),
    prisma.taskAssignment.update({
      where: { id: assignment.id },
      data: { completedAt: new Date() },
    }),
    prisma.task.update({ where: { id: taskId }, data: { status: "SUBMITTED" } }),
  ]);

  // Best-effort: a plagiarism check that fails shouldn't block a submission
  // that's already recorded. It runs after the transaction commits so it
  // has other trainers' committed submissions to compare against, not a
  // stale snapshot from before this one landed.
  await checkSubmissionSimilarity({
    submissionId: created.id,
    taskId,
    submittedById: session.user.id,
    justification,
  }).catch(() => null);

  revalidatePath("/trainer/tasks");
  revalidatePath(`/trainer/tasks/${taskId}`);
  return { status: "success", message: "Submitted. It's now queued for review." };
}

const customSubmitSchema = z.object({
  taskId: z.string().uuid(),
  durationSeconds: z.coerce.number().int().min(0),
});

/**
 * Submission path for CUSTOM projects. The response fields are defined by
 * the project's template, so validation happens against that schema rather
 * than a fixed zod shape — the browser's controls enforce the same rules,
 * but the browser is a convenience, not a boundary.
 */
export async function submitCustomTask(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  try {
    await assertCanAccessAssignments(session.user.id);
  } catch (err) {
    if (err instanceof GateError) return { status: "error", message: err.message };
    throw err;
  }

  const parsed = customSubmitSchema.safeParse({
    taskId: formData.get("taskId"),
    durationSeconds: formData.get("durationSeconds"),
  });
  if (!parsed.success) {
    return { status: "error", message: "Check your submission." };
  }
  const { taskId, durationSeconds } = parsed.data;

  const assignment = await prisma.taskAssignment.findUnique({
    where: { taskId_userId: { taskId, userId: session.user.id } },
    include: { task: { include: { project: true } } },
  });
  if (!assignment) return { status: "error", message: "This task isn't assigned to you." };
  if (assignment.completedAt) return { status: "error", message: "You've already submitted this task." };
  if (assignment.task.project.taskType !== "CUSTOM") {
    return { status: "error", message: "This task doesn't use a custom schema." };
  }

  const template = await prisma.taskTemplate.findFirst({
    where: { projectId: assignment.task.projectId },
    orderBy: { createdAt: "asc" },
  });
  const schema = template ? parseCustomSchema(template.schema) : null;
  if (!schema) return { status: "error", message: "This project's task schema is missing." };

  // Response inputs arrive as field_<key> — collected into a map keyed the
  // way the schema names them, then validated against it.
  const values: Record<string, unknown> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("field_")) values[key.slice(6)] = value;
  }

  const validated = validateCustomResponses(schema, values);
  if (!validated.ok) {
    return { status: "error", message: validated.errors[0]?.message ?? "Check your responses." };
  }

  const priorVersions = await prisma.taskSubmission.count({ where: { taskId } });

  const [created] = await prisma.$transaction([
    prisma.taskSubmission.create({
      data: {
        taskId,
        submittedById: session.user.id,
        content: { responses: validated.responses } as Prisma.InputJsonValue,
        durationSeconds,
        version: priorVersions + 1,
      },
    }),
    prisma.taskAssignment.update({
      where: { id: assignment.id },
      data: { completedAt: new Date() },
    }),
    prisma.task.update({ where: { id: taskId }, data: { status: "SUBMITTED" } }),
  ]);

  const freeText = customResponseText(schema, validated.responses);
  if (freeText) {
    await checkSubmissionSimilarity({
      submissionId: created.id,
      taskId,
      submittedById: session.user.id,
      justification: freeText,
    }).catch(() => null);
  }

  revalidatePath("/trainer/tasks");
  revalidatePath(`/trainer/tasks/${taskId}`);
  return { status: "success", message: "Submitted. It's now queued for review." };
}
