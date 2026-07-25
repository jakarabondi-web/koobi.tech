"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { assertCanAccessAssignments, GateError } from "@/server/services/trainer-gate";

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

  await prisma.$transaction([
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

  revalidatePath("/trainer/tasks");
  revalidatePath(`/trainer/tasks/${taskId}`);
  return { status: "success", message: "Submitted. It's now queued for review." };
}
