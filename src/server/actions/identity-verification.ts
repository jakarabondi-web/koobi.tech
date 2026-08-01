"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions/can";
import { VerificationError, reviewVerification } from "@/server/services/identity-verification";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

const schema = z.object({
  userId: z.string().min(1),
  approve: z.enum(["true", "false"]),
  notes: z.string().trim().min(10, "Explain the decision — this is shown to the trainer if rejected."),
});

export async function reviewVerificationAction(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };
  assertCan(session.user.roles, "trainer.approve");

  const parsed = schema.safeParse({
    userId: formData.get("userId"),
    approve: formData.get("approve"),
    notes: formData.get("notes"),
  });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0]?.message ?? "Check your notes." };

  try {
    await reviewVerification({
      userId: parsed.data.userId,
      reviewerId: session.user.id,
      approve: parsed.data.approve === "true",
      notes: parsed.data.notes,
    });
  } catch (err) {
    if (err instanceof VerificationError) return { status: "error", message: err.message };
    throw err;
  }

  revalidatePath("/admin/compliance");
  return { status: "success", message: "Decision recorded." };
}
