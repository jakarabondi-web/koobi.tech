"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { CheckCircle2, MailWarning, GraduationCap, Building2, ArrowRight, ArrowLeft, Check } from "lucide-react";

import { registerUser, type RegisterState } from "@/server/actions/register";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils/cn";

const initialState: RegisterState = { status: "idle" };

type Role = "TRAINER" | "CLIENT_ADMIN";

const STEPS = ["Role", "About you", "Account", "Review"] as const;

/** Rough, cosmetic-only signal — the server enforces the real minimum. */
function passwordStrength(password: string): { label: string; score: 0 | 1 | 2 | 3 } {
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12 && /[A-Z]/.test(password) && /[a-z]/.test(password)) score++;
  if (/[0-9]/.test(password) && /[^A-Za-z0-9]/.test(password)) score++;
  const labels = ["Too short", "Weak", "Good", "Strong"] as const;
  return { label: labels[score], score: score as 0 | 1 | 2 | 3 };
}

export function RegisterForm({ defaultRole }: { defaultRole: Role }) {
  const [state, formAction, pending] = useActionState(registerUser, initialState);
  const [step, setStep] = useState(0);
  const [role, setRole] = useState<Role>(defaultRole);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

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

  const nameValid = firstName.trim().length > 0 && lastName.trim().length > 0;
  const accountValid = /\S+@\S+\.\S+/.test(email) && password.length >= 8;
  const canAdvance = [true, nameValid, accountValid, true][step];
  const strength = passwordStrength(password);

  return (
    <div className="space-y-6">
      {/* Step indicator — a segmented bar that fills as you go, not a static
          "step 1 of 4" label, so progress is something you see happen. */}
      <div>
        <div className="flex gap-1.5">
          {STEPS.map((label, i) => (
            <div
              key={label}
              className={cn(
                "h-1.5 flex-1 rounded-full transition-colors duration-500",
                i < step ? "bg-gradient-brand" : i === step ? "bg-accent-violet/60" : "bg-muted"
              )}
            />
          ))}
        </div>
        <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
          <span className="font-medium text-foreground">{STEPS[step]}</span>
          <span className="tabular-nums">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
      </div>

      <form action={formAction} className="space-y-5">
        {/* The visible controls per step are uncontrolled-by-name on purpose —
            these hidden inputs are the single source of truth submitted to
            the server action, so navigating between steps never loses or
            duplicates a value regardless of which step is currently shown. */}
        <input type="hidden" name="role" value={role} />
        <input type="hidden" name="firstName" value={firstName} />
        <input type="hidden" name="lastName" value={lastName} />
        <input type="hidden" name="email" value={email} />
        <input type="hidden" name="password" value={password} />

        <div key={step} className="animate-in fade-in slide-in-from-right-2 duration-300">
          {step === 0 ? (
            <div className="space-y-4">
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => signIn("google", { callbackUrl: "/" })}
              >
                <GoogleGlyph /> Continue with Google
              </Button>
              <div className="relative py-1 text-center text-xs text-muted-foreground">
                <span className="relative bg-card px-2">or set up with email</span>
                <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-border" />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <RoleCard
                  icon={GraduationCap}
                  title="Trainer / expert"
                  description="Evaluate and improve AI outputs in your area of expertise."
                  selected={role === "TRAINER"}
                  onSelect={() => setRole("TRAINER")}
                />
                <RoleCard
                  icon={Building2}
                  title="AI company"
                  description="Source vetted experts to train and evaluate your models."
                  selected={role === "CLIENT_ADMIN"}
                  onSelect={() => setRole("CLIENT_ADMIN")}
                />
              </div>
            </div>
          ) : null}

          {step === 1 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="firstName-visible">First name</Label>
                <Input
                  id="firstName-visible"
                  autoFocus
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  aria-invalid={!!state.errors?.firstName}
                />
                {state.errors?.firstName ? (
                  <p className="text-xs text-destructive">{state.errors.firstName}</p>
                ) : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="lastName-visible">Last name</Label>
                <Input
                  id="lastName-visible"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  aria-invalid={!!state.errors?.lastName}
                />
                {state.errors?.lastName ? (
                  <p className="text-xs text-destructive">{state.errors.lastName}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="email-visible">Email</Label>
                <Input
                  id="email-visible"
                  type="email"
                  autoFocus
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  aria-invalid={!!state.errors?.email}
                />
                {state.errors?.email ? <p className="text-xs text-destructive">{state.errors.email}</p> : null}
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="password-visible">Password</Label>
                <Input
                  id="password-visible"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  aria-invalid={!!state.errors?.password}
                />
                {password ? (
                  <div className="space-y-1">
                    <div className="flex gap-1">
                      {[0, 1, 2].map((i) => (
                        <div
                          key={i}
                          className={cn(
                            "h-1 flex-1 rounded-full transition-colors duration-300",
                            i < strength.score
                              ? strength.score === 1
                                ? "bg-warning"
                                : "bg-gradient-brand"
                              : "bg-muted"
                          )}
                        />
                      ))}
                    </div>
                    <p className="text-xs text-muted-foreground">{strength.label} — at least 8 characters.</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">At least 8 characters.</p>
                )}
                {state.errors?.password ? (
                  <p className="text-xs text-destructive">{state.errors.password}</p>
                ) : null}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div className="space-y-2 rounded-lg border border-border bg-muted/40 p-4 text-sm">
                <ReviewRow label="Signing up as" value={role === "TRAINER" ? "Trainer / expert" : "AI company"} />
                <ReviewRow label="Name" value={`${firstName} ${lastName}`} />
                <ReviewRow label="Email" value={email} />
              </div>
              {state.formError ? <p className="text-sm text-destructive">{state.formError}</p> : null}
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
            </div>
          ) : null}
        </div>

        <div className="flex items-center justify-between gap-3 pt-1">
          {step > 0 ? (
            <Button type="button" variant="outline" onClick={() => setStep((s) => s - 1)}>
              <ArrowLeft className="size-4" /> Back
            </Button>
          ) : (
            <span />
          )}

          {step < STEPS.length - 1 ? (
            <Button
              type="button"
              variant="violet"
              disabled={!canAdvance}
              onClick={() => setStep((s) => s + 1)}
            >
              Continue <ArrowRight className="size-4" />
            </Button>
          ) : (
            <Button type="submit" variant="violet" disabled={pending}>
              {pending ? "Creating account…" : "Create account"}
            </Button>
          )}
        </div>
      </form>
    </div>
  );
}

function RoleCard({
  icon: Icon,
  title,
  description,
  selected,
  onSelect,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  selected: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        "relative flex flex-col items-start gap-2 rounded-xl border p-4 text-left transition-all",
        selected
          ? "border-transparent bg-gradient-brand text-white shadow-glow-brand"
          : "border-input hover:border-accent-violet/50 hover:bg-accent/50"
      )}
    >
      {selected ? (
        <span className="absolute right-3 top-3 flex size-5 items-center justify-center rounded-full bg-white/20">
          <Check className="size-3.5" />
        </span>
      ) : null}
      <Icon className={cn("size-5", selected ? "text-white" : "text-accent-violet")} />
      <span className="text-sm font-semibold">{title}</span>
      <span className={cn("text-xs", selected ? "text-white/80" : "text-muted-foreground")}>{description}</span>
    </button>
  );
}

function ReviewRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className="text-muted-foreground">{label}</span>
      <span className="font-medium">{value}</span>
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
