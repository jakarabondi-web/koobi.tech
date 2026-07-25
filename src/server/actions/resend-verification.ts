"use server";

import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { issueEmailVerification } from "@/server/services/email-verification";

export type ResendState = { status: "idle" | "sent" };

/**
 * Always reports success so this endpoint can't be used to enumerate which
 * email addresses have accounts.
 */
export async function resendVerificationEmail(
  _prev: ResendState,
  formData: FormData
): Promise<ResendState> {
  const parsed = z.object({ email: z.string().email() }).safeParse({ email: formData.get("email") });
  if (!parsed.success) return { status: "sent" };

  const user = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } });
  if (user && !user.emailVerifiedAt) {
    await issueEmailVerification(user.id, user.email, user.firstName);
  }

  return { status: "sent" };
}
