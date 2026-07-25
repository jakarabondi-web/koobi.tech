"use server";

import { AuthError } from "next-auth";

import { signIn } from "@/lib/auth";

export type SsoSignInState = { status: "idle" | "error"; message?: string };

/**
 * Exchanges an SSO ticket for a session.
 *
 * Runs as a Server Action because that is where Auth.js can set the session
 * cookie; the OIDC callback route cannot. On success `signIn` redirects, so
 * nothing after it runs.
 */
export async function completeSsoSignIn(
  _prev: SsoSignInState,
  formData: FormData
): Promise<SsoSignInState> {
  const ticket = formData.get("ticket");
  if (typeof ticket !== "string" || ticket.length < 20) {
    return { status: "error", message: "This sign-in link is not valid. Start again from the sign-in page." };
  }

  try {
    await signIn("sso-ticket", { ticket, redirectTo: "/" });
  } catch (err) {
    // Auth.js signals a successful redirect by throwing; let it through.
    if (err instanceof AuthError) {
      return {
        status: "error",
        message: "That sign-in link has expired or was already used. Start again from the sign-in page.",
      };
    }
    throw err;
  }

  return { status: "idle" };
}
