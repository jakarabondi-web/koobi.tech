import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/marketing/login-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Sign in" };

/**
 * Reasons an SSO round-trip can come back unsuccessful. Each says what the
 * person can actually do next — "something went wrong" sends them to support
 * for problems they could have fixed themselves.
 */
const SSO_ERRORS: Record<string, string> = {
  sso_unknown_domain: "We don't recognise that email domain for single sign-on. Sign in with your password instead.",
  sso_not_configured: "Single sign-on isn't finished being set up for your organization. Ask your admin to complete it.",
  sso_provider_unreachable: "We couldn't reach your identity provider. Try again in a moment.",
  sso_denied: "Your identity provider declined the sign-in.",
  sso_expired: "That sign-in attempt took too long. Try again.",
  sso_state_mismatch: "That sign-in attempt couldn't be verified. Start again from this page.",
  sso_token_exchange_failed: "Your identity provider rejected the sign-in. Ask your admin to check the client credentials.",
  sso_no_id_token: "Your identity provider didn't return an ID token, so we can't verify who signed in. Ask your admin to enable the openid scope.",
  sso_no_jwks: "Your identity provider doesn't publish signing keys, so we can't verify its response.",
  sso_token_invalid: "We couldn't verify your identity provider's response. Start again — if it keeps happening, ask your admin to check the SSO configuration.",
  sso_email_unverified: "Your identity provider reports that your email address isn't verified. Confirm it there, then try again.",
  sso_domain_mismatch: "The account your provider returned isn't on your organization's verified domain.",
  sso_no_account: "There's no Trainora account for that address yet. Ask your admin to invite you first.",
  account_inactive: "This account isn't active. Contact support if you think that's wrong.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; for?: string; error?: string }>;
}) {
  const { callbackUrl, for: forSurface, error } = await searchParams;
  const ssoError = error ? SSO_ERRORS[error] : undefined;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>
          {forSurface
            ? `Sign in to access the ${forSurface} portal.`
            : "Sign in to your Trainora AI account."}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-6">
        {ssoError ? (
          <p className="mb-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {ssoError}
          </p>
        ) : null}
        <LoginForm callbackUrl={callbackUrl} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <Link href="/forgot-password" className="text-muted-foreground hover:underline">
            Forgot your password?
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
