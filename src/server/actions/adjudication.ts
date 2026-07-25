"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions/can";
import { resolveAdjudication, AdjudicationError } from "@/server/services/adjudication";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

const schema = z.object({
  adjudicationId: z.string().uuid(),
  decision: z.enum(["APPROVED", "REVISION_REQUESTED", "REJECTED"]),
  notes: z.string().min(15, "Explain the call — reviewers and the trainer both read this."),
});

export async function submitAdjudication(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };
  assertCan(session.user.roles, "task.adjudicate");

  const parsed = schema.safeParse({
    adjudicationId: formData.get("adjudicationId"),
    decision: formData.get("decision"),
    notes: formData.get("notes") ?? "",
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check your decision." };
  }

  try {
    const result = await resolveAdjudication({
      adjudicationId: parsed.data.adjudicationId,
      adjudicatorId: session.user.id,
      decision: parsed.data.decision,
      notes: parsed.data.notes,
    });

    revalidatePath("/trainer/adjudication");
    return {
      status: "success",
      message: result.overturned
        ? "Decision recorded — this overturned the earlier review, and the trainer's earnings were corrected."
        : "Decision recorded.",
    };
  } catch (err) {
    if (err instanceof AdjudicationError) return { status: "error", message: err.message };
    throw err;
  }
}
