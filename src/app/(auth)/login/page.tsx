import type { Metadata } from "next";
import Link from "next/link";
import { Wallet, Clock, Sparkles } from "lucide-react";

import { brand } from "@/config/brand";
import { LoginForm } from "@/components/marketing/login-form";
import { Card } from "@/components/ui/card";

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
  sso_no_account: "There's no Traivr account for that address yet. Ask your admin to invite you first.",
  account_inactive: "This account isn't active. Contact support if you think that's wrong.",
  oauth_no_email: "That provider didn't share an email address, so we can't match you to an account.",
  oauth_email_unverified: "That provider reports your email address isn't verified there yet. Verify it with them, then try again.",
  oauth_sso_required: "Your organization requires signing in through its own single sign-on, not a personal Google account.",
  oauth_inactive: "This account isn't active. Contact support if you think that's wrong.",
};

const BENEFITS = [
  { icon: Wallet, text: "Transparent pay, shown before you ever start a task" },
  { icon: Clock, text: "Flexible projects — work them on your own schedule" },
  { icon: Sparkles, text: "Your expertise, shaping AI models people actually use" },
];

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; for?: string; error?: string }>;
}) {
  const { callbackUrl, for: forSurface, error } = await searchParams;
  const ssoError = error ? SSO_ERRORS[error] : undefined;

  return (
    <Card className="w-full max-w-4xl gap-0 overflow-hidden p-0 md:flex-row">
      <div className="hidden flex-col justify-center gap-8 bg-gradient-to-br from-primary/10 via-accent-violet/10 to-accent-cyan/10 p-10 md:flex md:w-5/12">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            {forSurface ? `Welcome back to your ${forSurface} portal.` : "Good to see you again."}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">{brand.tagline}</p>
        </div>
        <ul className="space-y-5">
          {BENEFITS.map(({ icon: Icon, text }) => (
            <li key={text} className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-background text-primary shadow-sm">
                <Icon className="size-4.5" />
              </span>
              <p className="pt-1.5 text-sm font-medium">{text}</p>
            </li>
          ))}
        </ul>
      </div>

      <div className="flex-1 p-8 sm:p-10">
        <h2 className="text-xl font-semibold tracking-tight">Sign in</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {forSurface ? `Sign in to access the ${forSurface} portal.` : "Sign in to your Traivr account."}
        </p>

        {ssoError ? (
          <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            {ssoError}
          </p>
        ) : null}

        <div className="mt-6">
          <LoginForm callbackUrl={callbackUrl} />
        </div>

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
      </div>
    </Card>
  );
}
