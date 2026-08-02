import crypto from "node:crypto";
import bcrypt from "bcryptjs";

import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/client";
import { brand } from "@/config/brand";
import { appUrl } from "@/lib/app-url";

export class AccountError extends Error {}

const EMAIL_CHANGE_TOKEN_TTL_HOURS = 24;

/** Updates a user's own name fields. Available identically on every surface. */
export async function updateName(params: {
  userId: string;
  firstName: string;
  lastName: string;
  displayName?: string | null;
}) {
  return prisma.user.update({
    where: { id: params.userId },
    data: {
      firstName: params.firstName,
      lastName: params.lastName,
      displayName: params.displayName?.trim() || null,
    },
  });
}

/**
 * Changes a user's password after re-verifying the current one — the same
 * password-gated pattern as disable2fa and signOutEverywhere. Bumps
 * sessionVersion so every other signed-in session (a lost or shared
 * device) is invalidated on its next request; the caller is expected to
 * redirect to /login afterward since this session's own token goes stale
 * too.
 */
export async function changePassword(params: {
  userId: string;
  currentPassword: string;
  newPassword: string;
}) {
  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!user?.passwordHash) {
    throw new AccountError("This account has no password set, so this can't be done from here.");
  }

  const valid = await bcrypt.compare(params.currentPassword, user.passwordHash);
  if (!valid) throw new AccountError("Current password is incorrect.");

  const passwordHash = await bcrypt.hash(params.newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: user.id },
      data: { passwordHash, sessionVersion: { increment: 1 } },
    }),
    prisma.auditLog.create({
      data: { actorId: user.id, action: "user.password_changed", entityType: "User", entityId: user.id },
    }),
  ]);
}

/**
 * Starts a change of a user's login email. The `email` column — what login
 * actually uses — is left untouched until the link sent to the *new*
 * address is clicked; `pendingEmail` holds the requested value in the
 * meantime, and verifyEmailToken() performs the swap. Requires the current
 * password so a hijacked, already-open session tab can't quietly redirect
 * account recovery to an attacker's inbox.
 */
export async function requestEmailChange(params: {
  userId: string;
  newEmail: string;
  currentPassword: string;
}) {
  const email = params.newEmail.toLowerCase().trim();

  const user = await prisma.user.findUnique({ where: { id: params.userId } });
  if (!user?.passwordHash) {
    throw new AccountError("This account has no password set, so this can't be done from here.");
  }

  const valid = await bcrypt.compare(params.currentPassword, user.passwordHash);
  if (!valid) throw new AccountError("Current password is incorrect.");
  if (email === user.email) throw new AccountError("That's already your current email address.");

  const taken = await prisma.user.findUnique({ where: { email } });
  if (taken) throw new AccountError("That email address is already in use.");

  const token = crypto.randomBytes(32).toString("hex");
  await prisma.user.update({
    where: { id: user.id },
    data: {
      pendingEmail: email,
      emailVerificationToken: token,
      emailVerificationExpiresAt: new Date(Date.now() + EMAIL_CHANGE_TOKEN_TTL_HOURS * 3600_000),
    },
  });

  const url = `${appUrl()}/verify-email?token=${token}`;
  let mocked = false;
  try {
    ({ mocked } = await sendEmail({
      to: email,
      subject: `Confirm your new ${brand.name} email address`,
      html:
        `<p>Confirm this address to finish updating your ${brand.name} account email. ` +
        `This link expires in ${EMAIL_CHANGE_TOKEN_TTL_HOURS} hours.</p>` +
        `<p><a href="${url}">${url}</a></p>`,
    }));
  } catch (err) {
    console.error("[email] change-email verification send failed:", err);
    throw new AccountError("Couldn't send the confirmation email. Try again in a moment.");
  }

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "user.email_change_requested",
      entityType: "User",
      entityId: user.id,
      metadata: { newEmail: email },
    },
  });

  // Same convention as issueEmailVerification: only surfaced when this
  // deployment can't actually send email, so a dev environment can still
  // complete the flow without a real inbox.
  return { url: mocked ? url : null };
}
