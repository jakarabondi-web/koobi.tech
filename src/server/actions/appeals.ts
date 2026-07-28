"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions/can";
import { AppealError, decideAppeal, submitAppeal } from "@/server/services/appeals";

export type SubmitAppealState = { status: "idle" | "success" | "error"; message?: string };

const submitSchema = z.object({
  reviewId: z.string().min(1),
  reason: z.string().trim().min(20, "Explain what you think the reviewer got wrong — at least a couple of sentences."),
});

export async function submitAppealAction(_prev: SubmitAppealState, formData: FormData): Promise<SubmitAppealState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const parsed = submitSchema.safeParse({
    reviewId: formData.get("reviewId"),
    reason: formData.get("reason"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  try {
    await submitAppeal({ userId: session.user.id, reviewId: parsed.data.reviewId, reason: parsed.data.reason });
  } catch (err) {
    if (err instanceof AppealError) return { status: "error", message: err.message };
    throw err;
  }

  revalidatePath("/trainer/quality");
  revalidatePath("/admin/disputes");
  return { status: "success", message: "Appeal submitted — a lead reviewer will look at this." };
}

export type DecideAppealState = { status: "idle" | "success" | "error"; message?: string };

const decideSchema = z.object({
  appealId: z.string().min(1),
  outcome: z.enum(["UPHELD", "OVERTURNED"]),
  decision: z.string().trim().min(5, "Give a short reason for the record."),
});

export async function decideAppealAction(_prev: DecideAppealState, formData: FormData): Promise<DecideAppealState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };
  if (!can(session.user.roles, "dispute.resolve")) {
    return { status: "error", message: "You don't have permission to decide appeals." };
  }

  const parsed = decideSchema.safeParse({
    appealId: formData.get("appealId"),
    outcome: formData.get("outcome"),
    decision: formData.get("decision"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  try {
    await decideAppeal({
      appealId: parsed.data.appealId,
      decidedBy: session.user.id,
      outcome: parsed.data.outcome,
      decision: parsed.data.decision,
    });
  } catch (err) {
    if (err instanceof AppealError) return { status: "error", message: err.message };
    throw err;
  }

  revalidatePath("/admin/disputes");
  return { status: "success", message: "Decision recorded." };
}
