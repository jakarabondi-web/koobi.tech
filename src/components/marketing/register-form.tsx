"use client";

import { useActionState } from "react";
import Link from "next/link";
import { CheckCircle2 } from "lucide-react";

import { registerUser, type RegisterState } from "@/server/actions/register";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const initialState: RegisterState = { status: "idle" };

export function RegisterForm({ defaultRole }: { defaultRole: "TRAINER" | "CLIENT_ADMIN" }) {
  const [state, formAction, pending] = useActionState(registerUser, initialState);

  if (state.status === "success") {
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
  );
}
