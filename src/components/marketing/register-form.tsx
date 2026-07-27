"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { CheckCircle2, MailWarning } from "lucide-react";

import { registerUser, type RegisterState } from "@/server/actions/register";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const initialState: RegisterState = { status: "idle" };

export function RegisterForm({ defaultRole }: { defaultRole: "TRAINER" | "CLIENT_ADMIN" }) {
  const [state, formAction, pending] = useActionState(registerUser, initialState);

  if (state.status === "success") {
    // No email was sent, so saying "check your inbox" would strand the person
    // on an account they can never activate. Show the link instead.
    if (state.verificationUrl) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center">
          <MailWarning className="size-8 text-warning-foreground" />
          <p className="text-lg font-semibold">Account created</p>
          <p className="text-sm text-muted-foreground">
            Email delivery isn&apos;t set up on this deployment, so we couldn&apos;t send your
            confirmation. Use this link to activate your account — it&apos;s valid for 24 hours.
          </p>
          <Button asChild className="mt-2 w-full">
            <Link href={state.verificationUrl}>Confirm my email address</Link>
          </Button>
          <Button asChild variant="outline" className="w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      );
    }

    if (state.emailSendFailed) {
      return (
        <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center">
          <MailWarning className="size-8 text-warning-foreground" />
          <p className="text-lg font-semibold">Account created</p>
          <p className="text-sm text-muted-foreground">
            We couldn&apos;t send your confirmation email just now. Your account exists — go to sign
            in and use &ldquo;Resend verification email&rdquo; in a moment.
          </p>
          <Button asChild variant="outline" className="mt-2 w-full">
            <Link href="/login">Back to sign in</Link>
          </Button>
        </div>
      );
    }

    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-8 text-center">
        <CheckCircle2 className="size-8 text-success" />
        <p className="text-lg font-semibold">Check your email</p>
        <p className="text-sm text-muted-foreground">
          We sent a confirmation link to your address. You&apos;ll need to confirm it before you can
          sign in — the link is valid for 24 hours.
        </p>
        <Button asChild variant="outline" className="mt-2 w-full">
          <Link href="/login">Back to sign in</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        onClick={() => signIn("google", { callbackUrl: "/" })}
      >
        <GoogleGlyph /> Continue with Google
      </Button>
      <p className="text-center text-xs text-muted-foreground">
        Creates a trainer/expert account. Signing up as an AI company? Use the form below.
      </p>

      <div className="relative py-1 text-center text-xs text-muted-foreground">
        <span className="relative bg-card px-2">or</span>
        <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-border" />
      </div>

      <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label>I am signing up as a</Label>
        <RadioGroup defaultValue={defaultRole} name="role" className="grid grid-cols-2 gap-2">
          <Label className="flex cursor-pointer items-center gap-2 rounded-md border border-input p-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent">
            <RadioGroupItem value="TRAINER" />
            Trainer / expert
          </Label>
          <Label className="flex cursor-pointer items-center gap-2 rounded-md border border-input p-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent">
            <RadioGroupItem value="CLIENT_ADMIN" />
            AI company
          </Label>
        </RadioGroup>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" required aria-invalid={!!state.errors?.firstName} />
          {state.errors?.firstName ? <p className="text-xs text-destructive">{state.errors.firstName}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" required aria-invalid={!!state.errors?.lastName} />
          {state.errors?.lastName ? <p className="text-xs text-destructive">{state.errors.lastName}</p> : null}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input id="email" name="email" type="email" required aria-invalid={!!state.errors?.email} />
        {state.errors?.email ? <p className="text-xs text-destructive">{state.errors.email}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input id="password" name="password" type="password" required aria-invalid={!!state.errors?.password} />
        {state.errors?.password ? <p className="text-xs text-destructive">{state.errors.password}</p> : null}
      </div>
      {state.formError ? <p className="text-sm text-destructive">{state.formError}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Creating account…" : "Create account"}
      </Button>
      <p className="text-xs text-muted-foreground">
        By creating an account you agree to our{" "}
        <Link href="/legal/terms" className="underline">
          Terms
        </Link>{" "}
        and{" "}
        <Link href="/legal/privacy" className="underline">
          Privacy Policy
        </Link>
        .
      </p>
      </form>
    </div>
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
