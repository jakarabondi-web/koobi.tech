"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, RefreshCw } from "lucide-react";

import { beginVerification, refreshVerification, type ActionState } from "@/server/actions/verification";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

const initialState: ActionState = { status: "idle" };

export function VerificationStarter() {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>(initialState);
  const [consented, setConsented] = useState(false);

  useEffect(() => {
    if (state.status === "success" && state.redirectUrl) router.push(state.redirectUrl);
  }, [state, router]);

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setState(await beginVerification()));
      }}
    >
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
        <p className="font-medium">What we collect</p>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          <li>• A photo of a government-issued ID</li>
          <li>• A short selfie video to confirm you&apos;re physically present</li>
        </ul>
        <p className="mt-3 text-xs text-muted-foreground">
          Capture happens with our verification provider, not on this site. We receive only the
          result — we never store your ID images, selfie, or any biometric template.
        </p>
      </div>

      <Label className="flex items-start gap-2.5 text-sm font-normal">
        <Checkbox
          checked={consented}
          onCheckedChange={(v) => setConsented(v === true)}
          className="mt-0.5"
        />
        <span>
          I consent to biometric identity verification for the purpose of joining the trainer
          network, and understand my ID and selfie are processed by our verification provider.
        </span>
      </Label>

      {state.status === "error" && state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <Button type="submit" variant="violet" disabled={pending || !consented}>
        <ShieldCheck className="size-4" />
        {pending ? "Starting…" : "Start verification"}
      </Button>
    </form>
  );
}

export function VerificationRefresher() {
  const [pending, start] = useTransition();
  const [state, setState] = useState<ActionState>(initialState);
  return (
    <form
      className="space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        start(async () => setState(await refreshVerification()));
      }}
    >
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        <RefreshCw className="size-4" /> {pending ? "Checking…" : "Check status"}
      </Button>
      {state.message ? <p className="text-xs text-muted-foreground">{state.message}</p> : null}
    </form>
  );
}
