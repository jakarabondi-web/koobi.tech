"use server";

import bcrypt from "bcryptjs";
import { z } from "zod";

import { auth } from "@/lib/auth";
import {
  generateRecoveryCodes,
  generateTotpSecret,
  totpQrDataUrl,
  verifyTotpCode,
} from "@/lib/auth/two-factor";
import { decryptSecret, encryptSecret } from "@/lib/security/field-encryption";
import { prisma } from "@/lib/db/prisma";

export type StartEnrollState = {
  status: "idle" | "ready" | "error";
  message?: string;
  qrDataUrl?: string;
  /** The plaintext secret, shown once as a fallback for "can't scan the QR". */
  manualEntryKey?: string;
};

/**
 * Begins enrollment: generates a fresh secret and its QR code, but writes
 * nothing to the account yet. Nothing is enabled until confirmEnroll2fa
 * proves the person actually scanned it and can produce a valid code —
 * otherwise a page reload or a copy-paste mistake could lock someone into a
 * "2FA enabled" account they cannot pass.
 */
export async function startEnroll2fa(): Promise<StartEnrollState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { status: "error", message: "Not signed in." };
  if (user.twoFactorEnabled) {
    return { status: "error", message: "Two-factor authentication is already enabled." };
  }

  const secret = await generateTotpSecret();
  const qrDataUrl = await totpQrDataUrl(secret, user.email);

  // Held only in the encrypted secret column, unconfirmed. confirmEnroll2fa
  // reads it back; twoFactorEnabled stays false until that call succeeds, so
  // an abandoned enrollment never blocks sign-in.
  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorSecret: encryptSecret(secret) },
  });

  return { status: "ready", qrDataUrl, manualEntryKey: secret };
}

export type ConfirmEnrollState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** Shown exactly once, immediately after enabling. */
  recoveryCodes?: string[];
};

const codeSchema = z.string().regex(/^\d{6}$/, "Enter the 6-digit code from your authenticator app.");

export async function confirmEnroll2fa(
  _prev: ConfirmEnrollState,
  formData: FormData
): Promise<ConfirmEnrollState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const parsed = codeSchema.safeParse(formData.get("code"));
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.twoFactorSecret) {
    return { status: "error", message: "Start enrollment again — nothing is pending." };
  }
  if (user.twoFactorEnabled) {
    return { status: "error", message: "Two-factor authentication is already enabled." };
  }

  const valid = await verifyTotpCode(decryptSecret(user.twoFactorSecret), parsed.data);
  if (!valid) {
    return { status: "error", message: "That code didn't match. Check the time on your device and try again." };
  }

  const { plaintext, hashed } = generateRecoveryCodes();

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: true, twoFactorRecoveryCodes: hashed },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "user.two_factor_enabled",
      entityType: "User",
      entityId: user.id,
    },
  });

  return {
    status: "success",
    message: "Two-factor authentication is on.",
    recoveryCodes: plaintext,
  };
}

export type DisableState = { status: "idle" | "success" | "error"; message?: string };

const disableSchema = z.object({ password: z.string().min(1, "Enter your password.") });

/**
 * Turning 2FA off requires the password, not just an authenticated session —
 * otherwise anyone who found an unlocked, signed-in browser could strip the
 * second factor with one click and lock the real owner into a weaker account.
 */
export async function disable2fa(_prev: DisableState, formData: FormData): Promise<DisableState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const parsed = disableSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) {
    return {
      status: "error",
      message: "This account has no password set, so 2FA can't be turned off from here. Contact support.",
    };
  }
  if (!user.twoFactorEnabled) return { status: "error", message: "Two-factor authentication is already off." };

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return { status: "error", message: "Incorrect password." };

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorEnabled: false, twoFactorSecret: null, twoFactorRecoveryCodes: [] },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "user.two_factor_disabled",
      entityType: "User",
      entityId: user.id,
    },
  });

  return { status: "success", message: "Two-factor authentication is off." };
}

export type RegenerateRecoveryCodesState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** Shown exactly once, immediately after regenerating. */
  recoveryCodes?: string[];
};

/**
 * Invalidates every existing recovery code and issues a fresh set of 10.
 *
 * Password-gated for the same reason disable2fa is: recovery codes are a
 * second factor's bypass, so replacing them needs proof of the first factor,
 * not just an open session. Old codes stop working the instant this runs —
 * a partially-used set isn't topped back up to 10, it's fully replaced, so
 * someone who saw an old code (a shoulder-surf, a compromised note) can't
 * use it after the account holder notices and regenerates.
 */
export async function regenerateRecoveryCodes(
  _prev: RegenerateRecoveryCodesState,
  formData: FormData
): Promise<RegenerateRecoveryCodesState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const parsed = disableSchema.safeParse({ password: formData.get("password") });
  if (!parsed.success) return { status: "error", message: parsed.error.issues[0].message };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user?.passwordHash) {
    return {
      status: "error",
      message: "This account has no password set, so recovery codes can't be regenerated from here.",
    };
  }
  if (!user.twoFactorEnabled) {
    return { status: "error", message: "Two-factor authentication isn't enabled." };
  }

  const valid = await bcrypt.compare(parsed.data.password, user.passwordHash);
  if (!valid) return { status: "error", message: "Incorrect password." };

  const { plaintext, hashed } = generateRecoveryCodes();

  await prisma.user.update({
    where: { id: user.id },
    data: { twoFactorRecoveryCodes: hashed },
  });

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      action: "user.two_factor_recovery_codes_regenerated",
      entityType: "User",
      entityId: user.id,
    },
  });

  return {
    status: "success",
    message: "Recovery codes regenerated. Your old codes no longer work.",
    recoveryCodes: plaintext,
  };
}
