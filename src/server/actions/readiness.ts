"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { ReadinessError, submitReadinessResponse } from "@/server/services/readiness";

export type ReadinessActionState =
  | { status: "idle" }
  | { status: "error"; message: string }
  | { status: "success"; result: { choice: string; correct: boolean; correctChoice: string; guidance: string } };

/** Records a trainee's choice on one readiness calibration task. */
export async function submitReadinessTask(
  _prev: ReadinessActionState,
  formData: FormData
): Promise<ReadinessActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const taskId = String(formData.get("taskId") ?? "");
  const choice = formData.get("choice");
  if (choice !== "A" && choice !== "B") {
    return { status: "error", message: "Pick the better response before submitting." };
  }

  try {
    const result = await submitReadinessResponse({ userId: session.user.id, taskId, choice });
    revalidatePath("/trainer/readiness");
    revalidatePath(`/trainer/readiness/${taskId}`);
    revalidatePath("/trainer/dashboard");
    return { status: "success", result };
  } catch (err) {
    if (err instanceof ReadinessError) return { status: "error", message: err.message };
    throw err;
  }
}
