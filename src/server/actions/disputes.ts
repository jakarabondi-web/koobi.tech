"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions/can";
import { DisputeError, resolveDispute } from "@/server/services/disputes";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

const schema = z.object({
  disputeId: z.string().min(1),
  outcome: z.enum(["RESOLVED_APPROVED", "RESOLVED_DENIED"]),
  decision: z.string().trim().min(5, "Give a short reason for the record."),
});

export async function resolveDisputeAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };
  assertCan(session.user.roles, "dispute.resolve");

  const parsed = schema.safeParse({
    disputeId: formData.get("disputeId"),
    outcome: formData.get("outcome"),
    decision: formData.get("decision"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check your decision." };

  try {
    await resolveDispute({
      disputeId: parsed.data.disputeId,
      resolvedBy: session.user.id,
      outcome: parsed.data.outcome,
      decision: parsed.data.decision,
    });
  } catch (err) {
    if (err instanceof DisputeError) return { status: "error", message: err.message };
    throw err;
  }

  revalidatePath("/admin/disputes");
  return { status: "success", message: "Decision recorded." };
}
