"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";

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
  const [resent, setResent] = useState(false);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setPending(true);
    setError(null);
    setNeedsVerification(false);
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
      } else {
        setError("Invalid email or password.");
      }
      return;
    }

    router.push(callbackUrl || "/trainer/dashboard");
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
    </form>
  );
}
