"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions/can";
import { RiskFlagError, resolveRiskFlag } from "@/server/services/fraud";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

const schema = z.object({
  flagId: z.string().min(1),
  outcome: z.enum(["REVIEWED", "DISMISSED", "ACTION_TAKEN"]),
  notes: z.string().trim().min(5, "Give a short reason for the record."),
});

export async function resolveRiskFlagAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };
  assertCan(session.user.roles, "risk.resolve");

  const parsed = schema.safeParse({
    flagId: formData.get("flagId"),
    outcome: formData.get("outcome"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check your notes." };

  try {
    await resolveRiskFlag({
      flagId: parsed.data.flagId,
      actorId: session.user.id,
      outcome: parsed.data.outcome,
      notes: parsed.data.notes,
    });
  } catch (err) {
    if (err instanceof RiskFlagError) return { status: "error", message: err.message };
    throw err;
  }

  revalidatePath("/admin/fraud");
  return { status: "success", message: "Flag resolved." };
}
