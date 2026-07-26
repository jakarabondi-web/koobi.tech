"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { getSession, signIn } from "next-auth/react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { resendVerificationEmail } from "@/server/actions/resend-verification";

export function LoginForm({ callbackUrl }: { callbackUrl?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [needsVerification, setNeedsVerification] = useState(false);
  const [needsSso, setNeedsSso] = useState(false);
  const [resent, setResent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setNeedsVerification(false);
    setNeedsSso(false);
    setResent(false);

    const res = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setPending(false);

    if (res?.error) {
      // Auth.js surfaces the CredentialsSignin code we threw in the provider.
      if (res.code === "email_unverified") {
        setNeedsVerification(true);
        setError("Confirm your email address before signing in.");
      } else if (res.code === "account_inactive") {
        setError("This account isn't active. Contact support if you think that's wrong.");
      } else if (res.code === "sso_required") {
        setNeedsSso(true);
        setError("Your organization requires single sign-on.");
      } else if (res.code?.startsWith("two_factor_required:")) {
        // The password was correct; a challenge token rode inside the error
        // code (CredentialsSignin has no other channel to pass one back).
        const challenge = res.code.slice("two_factor_required:".length);
        const params = new URLSearchParams({ challenge });
        if (callbackUrl) params.set("callbackUrl", callbackUrl);
        router.push(`/login/verify-2fa?${params.toString()}`);
      } else {
        setError("Invalid email or password.");
      }
      return;
    }

    // Send people to the portal their roles actually grant. Assuming the
    // trainer dashboard meant a client admin's first act after signing in
    // was to hit a 403.
    const session = await getSession();
    const home =
      session?.user?.surface === "admin"
        ? "/admin/dashboard"
        : session?.user?.surface === "client"
          ? "/client/dashboard"
          : "/trainer/dashboard";

    router.push(callbackUrl || home);
    router.refresh();
  }

  async function onResend() {
    const data = new FormData();
    data.set("email", email);
    await resendVerificationEmail({ status: "idle" }, data);
    setResent(true);
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          type="password"
          autoComplete="current-password"
          required
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {needsSso ? (
        <a
          href={`/api/auth/sso/start?email=${encodeURIComponent(email)}`}
          className="flex h-9 w-full items-center justify-center rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Continue with single sign-on
        </a>
      ) : null}
      {needsVerification ? (
        resent ? (
          <p className="text-sm text-success">
            Verification email sent. Check your inbox for the confirmation link.
          </p>
        ) : (
          <button
            type="button"
            onClick={onResend}
            className="text-sm font-medium text-primary hover:underline"
          >
            Resend verification email
          </button>
        )
      ) : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Signing in…" : "Sign in"}
      </Button>

      <div className="relative py-1 text-center text-xs text-muted-foreground">
        <span className="relative bg-card px-2">or continue with</span>
        <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-border" />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => signIn("google", { callbackUrl: callbackUrl || "/" })}
        >
          <GoogleGlyph /> Google
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => signIn("linkedin", { callbackUrl: callbackUrl || "/" })}
        >
          <LinkedInGlyph /> LinkedIn
        </Button>
      </div>
    </form>
  );
}

function GoogleGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" aria-hidden="true">
      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.99.67-2.26 1.06-3.71 1.06-2.85 0-5.27-1.93-6.13-4.52H2.18v2.84A11 11 0 0 0 12 23z" />
      <path fill="#FBBC05" d="M5.87 14.11a6.6 6.6 0 0 1 0-4.22V7.05H2.18a11 11 0 0 0 0 9.9z" />
      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1a11 11 0 0 0-9.82 6.05l3.69 2.84C6.73 7.3 9.15 5.38 12 5.38z" />
    </svg>
  );
}

function LinkedInGlyph() {
  return (
    <svg viewBox="0 0 24 24" className="size-4" fill="#0A66C2" aria-hidden="true">
      <path d="M20.45 20.45h-3.56v-5.57c0-1.33-.02-3.03-1.85-3.03-1.85 0-2.14 1.44-2.14 2.94v5.66H9.34V9h3.42v1.56h.05c.48-.9 1.64-1.85 3.38-1.85 3.61 0 4.27 2.38 4.27 5.47zM5.34 7.43a2.07 2.07 0 1 1 0-4.13 2.07 2.07 0 0 1 0 4.13zM7.12 20.45H3.56V9h3.56z" />
    </svg>
  );
}
