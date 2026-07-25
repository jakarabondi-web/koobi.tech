import crypto from "node:crypto";

import { prisma } from "@/lib/db/prisma";
import { sendEmail } from "@/lib/email/client";
import { brand } from "@/config/brand";

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

  const url = `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/verify-email?token=${token}`;

  await sendEmail({
    to: email,
    subject: `Confirm your ${brand.name} email address`,
    html:
      `<p>Hi ${firstName},</p>` +
      `<p>Confirm your email address to activate your ${brand.name} account. ` +
      `This link expires in ${TOKEN_TTL_HOURS} hours.</p>` +
      `<p><a href="${url}">${url}</a></p>`,
  });

  return token;
}

export type VerifyResult = "verified" | "already_verified" | "invalid" | "expired";

export async function verifyEmailToken(token: string): Promise<VerifyResult> {
  const user = await prisma.user.findUnique({ where: { emailVerificationToken: token } });
  if (!user) return "invalid";
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
