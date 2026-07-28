"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";

export type SignOutEverywhereState = { status: "idle" | "success" | "error"; message?: string };

const passwordSchema = z.object({ password: z.string().min(1, "Enter your password.") });

/**
 * Invalidates every session for this account, including the one making the
 * request — sessions here are stateless JWTs, so there's no per-device
 * session store to selectively revoke from (see LoginEvent's doc comment
 * in prisma/schema.prisma). Bumping sessionVersion is the only lever:
 * every token embeds the version it was issued under, and the Node-runtime
 * auth() check in lib/auth/index.ts rejects any token whose version doesn't
 * match the account's current one.
 *
 * Password-gated like disable2fa/regenerateRecoveryCodes — this is a
 * blunt, account-wide action, not something an open, unattended browser
 * tab should be able to trigger with one click.
 */
export async function signOutEverywhere(
  _prev: SignOutEverywhereState,
  formData: FormData
): Promise<SignOutEverywhereState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const parsed = passwordSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) {
    return { status: "error", message: "This account has no password set, so this can't be done from here." };
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return { status: "error", message: "Incorrect password." };

  await prisma.user.update({
    where: { id: user.id },
    data: { sessionVersion: { increment: 1 } },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "user.sessions_revoked_all",
      entityType: "User",
      entityId: user.id,
    },
  });

  // No need to also call next-auth's signOut() here — the bumped
  // sessionVersion already makes every existing token, including this
  // browser's own cookie, fail the check in lib/auth/index.ts's jwt()
  // callback on its very next use. Redirecting to /login is enough to
  // surface that: the next auth() call there sees no valid session.
  //
  // This request's own token is now stale too, by design — the account
  // holder asked to end every session, and "every session but this one"
  // would need per-token identity this app's stateless JWTs don't carry.
  redirect("/login");
}
