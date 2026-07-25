"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";

import { submitContactForm, type ContactState } from "@/server/actions/contact";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ContactState = { status: "idle" };

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContactForm, initialState);

  if (state.status === "success") {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-border bg-card p-10 text-center">
        <CheckCircle2 className="size-8 text-success" />
        <p className="text-lg font-semibold">Thanks — we&apos;ll be in touch shortly.</p>
        <p className="text-sm text-muted-foreground">A member of our team typically replies within one business day.</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5 rounded-xl border border-border bg-card p-6 sm:p-8">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full name</Label>
          <Input id="name" name="name" required aria-invalid={!!state.errors?.name} />
          {state.errors?.name ? <p className="text-xs text-destructive">{state.errors.name}</p> : null}
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="workEmail">Work email</Label>
          <Input id="workEmail" name="workEmail" type="email" required aria-invalid={!!state.errors?.workEmail} />
          {state.errors?.workEmail ? <p className="text-xs text-destructive">{state.errors.workEmail}</p> : null}
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="company">Company</Label>
        <Input id="company" name="company" required aria-invalid={!!state.errors?.company} />
        {state.errors?.company ? <p className="text-xs text-destructive">{state.errors.company}</p> : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="useCase">What are you looking to build?</Label>
        <Textarea id="useCase" name="useCase" rows={4} required aria-invalid={!!state.errors?.useCase} />
        {state.errors?.useCase ? <p className="text-xs text-destructive">{state.errors.useCase}</p> : null}
      </div>
      <Button type="submit" variant="violet" size="lg" className="w-full" disabled={pending}>
        {pending ? "Sending…" : "Request a demo"}
      </Button>
    </form>
  );
}
