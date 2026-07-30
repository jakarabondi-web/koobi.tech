"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { startAttempt, submitAttempt, AssessmentError } from "@/server/services/assessments";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

export async function beginAssessment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const assessmentId = String(formData.get("assessmentId") ?? "");
  let attemptId: string;

  try {
    const { attempt } = await startAttempt({ userId: session.user.id, assessmentId });
    attemptId = attempt.id;
  } catch (err) {
    if (err instanceof AssessmentError) return { status: "error", message: err.message };
    throw err;
  }

  redirect(`/trainer/assessments/${assessmentId}/attempt/${attemptId}`);
}

export async function finishAssessment(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const attemptId = String(formData.get("attemptId") ?? "");

  const answers: Record<string, string> = {};
  for (const [key, value] of formData.entries()) {
    if (key.startsWith("q_")) answers[key.slice(2)] = String(value);
  }

  try {
    const result = await submitAttempt({ userId: session.user.id, attemptId, answers });
    revalidatePath("/trainer/assessments");
    revalidatePath("/trainer/readiness");
    revalidatePath("/trainer/dashboard");
    return {
      status: "success",
      message:
        result.status === "PASSED"
          ? `Passed with ${Math.round(result.score * 100)}%.`
          : result.status === "UNDER_REVIEW"
            ? "Submitted — your written answers are now with a reviewer."
            : `Not passed. You scored ${Math.round(result.score * 100)}%.`,
    };
  } catch (err) {
    if (err instanceof AssessmentError) return { status: "error", message: err.message };
    throw err;
  }
}
