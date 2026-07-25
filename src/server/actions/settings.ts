"use server";

import { revalidatePath } from "next/cache";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

export async function setSensitiveContentOptIn(
  _prev: ActionState,
  formData: FormData
): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const optIn = formData.get("optIn") === "true";

  await prisma.trainerProfile.update({
    where: { userId: session.user.id },
    data: { sensitiveContentOptIn: optIn },
  });

  revalidatePath("/trainer/settings");
  return {
    status: "success",
    message: optIn
      ? "You may now be matched to projects containing sensitive content."
      : "You won't be matched to projects containing sensitive content.",
  };
}
