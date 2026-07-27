"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions/can";
import { assertClearedForTrainerWork, GateError } from "@/server/services/trainer-gate";
import { submitReview, ReviewError } from "@/server/services/reviews";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

const schema = z.object({
  submissionId: z.string().uuid(),
  decision: z.enum(["APPROVED", "REVISION_REQUESTED", "REJECTED", "ESCALATED"]),
  feedback: z.string().default(""),
  confidence: z.coerce.number().min(0).max(1),
  severity: z.string().optional(),
});

export async function recordReview(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };
  assertCan(session.user.roles, "task.review");

  // A reviewer's scores move other trainers' quality ratings and pay, so
  // holding the role is not enough — an unapproved applicant granted it
  // must still clear the gate. Staff are exempt; see the helper.
  try {
    await assertClearedForTrainerWork(session.user);
  } catch (err) {
    if (err instanceof GateError) return { status: "error", message: err.message };
    throw err;
  }

  const parsed = schema.safeParse({
    submissionId: formData.get("submissionId"),
    decision: formData.get("decision"),
    feedback: formData.get("feedback") ?? "",
    confidence: formData.get("confidence"),
    severity: formData.get("severity") || undefined,
  });
  if (!parsed.success) return { status: "error", message: "Check your review before submitting." };

  // Anything other than a clean approval has to explain itself — the trainer
  // reads this, and "rejected, no reason" is how you lose good workers.
  if (parsed.data.decision !== "APPROVED" && parsed.data.feedback.trim().length < 15) {
    return {
      status: "error",
      message: "Explain the issue in at least 15 characters — the trainer sees this feedback.",
    };
  }

  const scores: Array<{ category: string; score: number }> = [];
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("score_")) scores.push({ category: key.slice(6), score: Number(value) });
  }

  try {
    await submitReview({
      submissionId: parsed.data.submissionId,
      reviewerId: session.user.id,
      decision: parsed.data.decision,
      feedback: parsed.data.feedback,
      confidence: parsed.data.confidence,
      severity: parsed.data.severity,
      scores,
    });
  } catch (err) {
    if (err instanceof ReviewError) return { status: "error", message: err.message };
    throw err;
  }

  revalidatePath("/trainer/review");
  redirect("/trainer/review?done=1");
}
