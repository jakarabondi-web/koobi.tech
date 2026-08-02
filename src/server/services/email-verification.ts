import crypto from "node:crypto";

import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/client";
import { brand } from "@/config/brand";
import { appUrl } from "@/lib/app-url";

const TOKEN_TTL_HOURS = 24;

export async function issueEmailVerification(userId: string, email: string, firstName: string) {
  const token = crypto.randomBytes(32).toString("hex");

  await prisma.user.update({
    where: { id: userId },
    data: {
      emailVerificationToken: token,
      emailVerificationExpiresAt: new Date(Date.now() + TOKEN_TTL_HOURS * 3600_000),
    },
  });

  const url = `${appUrl()}/verify-email?token=${token}`;

  let mocked = false;
  let delivered = false;

  try {
    ({ mocked } = await sendEmail({
      to: email,
      subject: `Confirm your ${brand.name} email address`,
      html:
        `<p>Hi ${firstName},</p>` +
        `<p>Confirm your email address to activate your ${brand.name} account. ` +
        `This link expires in ${TOKEN_TTL_HOURS} hours.</p>` +
        `<p><a href="${url}">${url}</a></p>`,
    }));
    delivered = !mocked;
  } catch (err) {
    // A provider outage or a bad API key must not take down registration —
    // the account already exists at this point, so throwing would leave
    // someone with an account and a stack trace. They can use "resend"
    // instead.
    console.error("[email] verification send failed:", err);
  }

  return {
    token,
    delivered,
    // Returned only when this deployment cannot send email at all, so the
    // caller can show the link rather than point someone at an inbox that
    // will never receive anything. Deliberately null once email works — the
    // inbox is then the proof of address ownership, and showing the link
    // would bypass it. Also null on a send failure, because that is a
    // transient fault on a deployment where email *is* configured.
    url: mocked ? url : null,
  };
}

export type VerifyResult = "verified" | "already_verified" | "invalid" | "expired";

export async function verifyEmailToken(token: string): Promise<VerifyResult> {
  const user = await prisma.user.findUnique({ where: { emailVerificationToken: token } });
  if (!user) return "invalid";

  // A pending email means this token is confirming a change-email request
  // (see requestEmailChange), not initial signup — `emailVerifiedAt` is
  // already set from before, so it must be checked first, or every change
  // would short-circuit as "already_verified" below.
  if (user.pendingEmail) {
    if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
      return "expired";
    }

    // Someone else may have claimed the address while this link was
    // outstanding — re-check rather than trust the uniqueness check made
    // when the change was requested.
    const taken = await prisma.user.findUnique({ where: { email: user.pendingEmail } });
    if (taken && taken.id !== user.id) {
      await prisma.user.update({
        where: { id: user.id },
        data: { pendingEmail: null, emailVerificationToken: null, emailVerificationExpiresAt: null },
      });
      return "invalid";
    }

    await prisma.user.update({
      where: { id: user.id },
      data: {
        email: user.pendingEmail,
        pendingEmail: null,
        emailVerifiedAt: new Date(),
        emailVerificationToken: null,
        emailVerificationExpiresAt: null,
      },
    });

    return "verified";
  }

  if (user.emailVerifiedAt) return "already_verified";
  if (!user.emailVerificationExpiresAt || user.emailVerificationExpiresAt < new Date()) {
    return "expired";
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      emailVerifiedAt: new Date(),
      status: "ACTIVE",
      emailVerificationToken: null,
      emailVerificationExpiresAt: null,
    },
  });

  return "verified";
}
