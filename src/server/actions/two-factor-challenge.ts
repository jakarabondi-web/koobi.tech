"use server";

import { AuthError } from "next-auth";
import { z } from "zod";

import { signIn } from "@/lib/auth";

export type TwoFactorChallengeState = { status: "idle" | "error"; message?: string };

const schema = z.object({
  challenge: z.string().min(20),
  code: z.string().min(6, "Enter the 6-digit code, or a recovery code."),
});

/**
 * Finishes a sign-in that was paused for a second factor — reached from
 * both the password path (a challenge token from TwoFactorRequiredError) and
 * the OAuth path (a challenge token the signIn callback redirected to).
 *
 * The actual code check happens inside the "two-factor-ticket" Credentials
 * provider, atomically with claiming the challenge, so this action is just
 * the plumbing that gets the browser there.
 */
export async function completeTwoFactorChallenge(
  _prev: TwoFactorChallengeState,
  formData: FormData
): Promise<TwoFactorChallengeState> {
  const parsed = schema.safeParse({
    challenge: formData.get("challenge"),
    code: formData.get("code"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the code and try again." };
  }

  try {
    await signIn("two-factor-ticket", {
      challenge: parsed.data.challenge,
      code: parsed.data.code,
      redirectTo: "/",
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return {
        status: "error",
        message: "That code wasn't accepted, or this sign-in attempt has expired. Try again.",
      };
    }
    throw err;
  }

  return { status: "idle" };
}
