import { createHash, randomBytes } from "node:crypto";

import { generate, generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";

import { brand } from "@/config/brand";
import { prisma } from "@/lib/db/prisma";

const CHALLENGE_TTL_MINUTES = 5;

/**
 * TOTP enrollment and verification.
 *
 * Time-based codes only — no SMS. SMS 2FA is phishable via SIM-swap and
 * carrier social engineering; an authenticator app secret never leaves the
 * user's device once enrolled.
 */

export async function generateTotpSecret(): Promise<string> {
  return generateSecret();
}

export async function totpUri(secret: string, email: string): Promise<string> {
  return generateURI({ issuer: brand.name, label: email, secret });
}

export async function totpQrDataUrl(secret: string, email: string): Promise<string> {
  return QRCode.toDataURL(await totpUri(secret, email));
}

/**
 * Accepts one 30s time step of drift either side of "now".
 *
 * `epochTolerance` is denominated in seconds, not steps — passing 1 (meant
 * as "one step") silently accepted almost no real-world clock skew at all,
 * confirmed by generating a code 30s in the past and finding it rejected.
 * The period this project's secrets use is the otplib default of 30s, so
 * that's the tolerance value, not the step count.
 */
const TOTP_PERIOD_SECONDS = 30;

export async function verifyTotpCode(secret: string, code: string): Promise<boolean> {
  const trimmed = code.replace(/\s+/g, "");
  if (!/^\d{6}$/.test(trimmed)) return false;
  try {
    const result = await verify({ token: trimmed, secret, epochTolerance: TOTP_PERIOD_SECONDS });
    return result.valid;
  } catch {
    return false;
  }
}

/** Generates one live code — used only by tests to drive a real verification. */
export async function generateTotpCode(secret: string): Promise<string> {
  return generate({ secret });
}

const RECOVERY_CODE_COUNT = 10;

/** Generates plaintext recovery codes (shown once) and their stored hashes. */
export function generateRecoveryCodes(): { plaintext: string[]; hashed: string[] } {
  // 4 bytes -> 8 hex chars, split into two groups of 4 ("xxxx-xxxx"). Using
  // 5 bytes here previously produced a lopsided 4-4-2 split that the
  // recovery-code input's maxLength (sized for "xxxx-xxxx") silently
  // truncated, making every recovery code unusable.
  const plaintext = Array.from({ length: RECOVERY_CODE_COUNT }, () =>
    randomBytes(4).toString("hex").match(/.{1,4}/g)!.join("-")
  );
  return { plaintext, hashed: plaintext.map(hashRecoveryCode) };
}

export function hashRecoveryCode(code: string): string {
  return createHash("sha256").update(code.trim().toLowerCase()).digest("hex");
}

/**
 * Checks a submitted recovery code against the stored hash list.
 * Returns the remaining list with the used code removed — a recovery code
 * has to be single-use, or it is just a second permanent password.
 */
export function consumeRecoveryCode(
  storedHashes: string[],
  submitted: string
): { valid: boolean; remaining: string[] } {
  const hash = hashRecoveryCode(submitted);
  const index = storedHashes.indexOf(hash);
  if (index === -1) return { valid: false, remaining: storedHashes };
  return { valid: true, remaining: storedHashes.filter((_, i) => i !== index) };
}

/**
 * Opens a 2FA challenge for a user who has already proven their password (or
 * an OAuth provider's verified email) but still needs to clear a second
 * factor.
 *
 * A route handler and a signIn callback can't hand a value directly to the
 * credentials provider that finishes the sign-in, so — same reasoning as
 * SsoTicket — the handoff goes through a short-lived, single-use DB row
 * instead of anything carried in a client-editable field.
 */
export async function createTwoFactorChallenge(userId: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await prisma.twoFactorChallenge.create({
    data: {
      token,
      userId,
      expiresAt: new Date(Date.now() + CHALLENGE_TTL_MINUTES * 60_000),
    },
  });
  return token;
}
