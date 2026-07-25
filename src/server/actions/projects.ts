"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { assertCanAccessAssignments, GateError } from "@/server/services/trainer-gate";
import { checkProjectEligibility } from "@/server/services/work-location";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

/** Trainer applies to a project. Gated on approval *and* jurisdiction rules. */
export async function applyToProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const projectId = String(formData.get("projectId") ?? "");

  try {
    await assertCanAccessAssignments(session.user.id);
  } catch (err) {
    if (err instanceof GateError) return { status: "error", message: err.message };
    throw err;
  }

  const eligibility = await checkProjectEligibility({ userId: session.user.id, projectId });
  if (!eligibility.eligible) {
    return { status: "error", message: eligibility.reasons.join(" ") };
  }

  const existing = await prisma.projectApplication.findUnique({
    where: { projectId_userId: { projectId, userId: session.user.id } },
  });
  if (existing) return { status: "error", message: "You've already applied to this project." };

  await prisma.projectApplication.create({
    data: { projectId, userId: session.user.id, status: "APPLIED" },
  });

  revalidatePath(`/trainer/projects/${projectId}`);
  revalidatePath("/trainer/projects/mine");
  return { status: "success", message: "Application submitted. We'll let you know if you're matched." };
}
