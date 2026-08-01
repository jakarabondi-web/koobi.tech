"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions/can";
import { AssignmentError, matchApplication, rejectApplication } from "@/server/services/assignment";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

const matchSchema = z.object({
  applicationId: z.string().min(1),
  projectId: z.string().min(1),
});

export async function matchApplicationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };
  assertCan(session.user.roles, "assignment.match");

  const parsed = matchSchema.safeParse({
    applicationId: formData.get("applicationId"),
    projectId: formData.get("projectId"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid request." };

  try {
    await matchApplication({ applicationId: parsed.data.applicationId, decidedBy: session.user.id });
  } catch (err) {
    if (err instanceof AssignmentError) return { status: "error", message: err.message };
    throw err;
  }

  revalidatePath(`/admin/projects/${parsed.data.projectId}`);
  revalidatePath("/trainer/projects/mine");
  return { status: "success", message: "Trainer matched and assigned." };
}

const rejectSchema = z.object({
  applicationId: z.string().min(1),
  projectId: z.string().min(1),
  reason: z.string().trim().optional(),
});

export async function rejectApplicationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };
  assertCan(session.user.roles, "assignment.match");

  const parsed = rejectSchema.safeParse({
    applicationId: formData.get("applicationId"),
    projectId: formData.get("projectId"),
    reason: formData.get("reason") || undefined,
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Invalid request." };

  try {
    await rejectApplication({
      applicationId: parsed.data.applicationId,
      decidedBy: session.user.id,
      reason: parsed.data.reason,
    });
  } catch (err) {
    if (err instanceof AssignmentError) return { status: "error", message: err.message };
    throw err;
  }

  revalidatePath(`/admin/projects/${parsed.data.projectId}`);
  revalidatePath("/trainer/projects/mine");
  return { status: "success", message: "Application declined." };
}
