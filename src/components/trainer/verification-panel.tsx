"use client";

import { useEffect, useState, useTransition, useActionState } from "react";
import { useRouter } from "next/navigation";
import { ShieldCheck, RefreshCw, Upload } from "lucide-react";

import { beginVerification, refreshVerification, type ActionState } from "@/server/actions/verification";
import {
  submitManualVerificationAction,
  type ActionState as ManualActionState,
} from "@/server/actions/manual-verification";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

const initialState: ActionState = { status: "idle" };
const manualInitialState: ManualActionState = { status: "idle" };

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

/**
 * The free, human-reviewed alternative when no vendor is configured — a
 * trainer uploads an ID photo and a selfie directly, and an admin decides
 * (src/app/admin/compliance). Honest about the tradeoff: unlike the vendor
 * flow, these images ARE stored — only until reviewed, then deleted (see
 * reviewVerification in src/server/services/identity-verification.ts) —
 * and there's no automated liveness/anti-spoof check, just a human looking
 * at two photos.
 */
export function ManualVerificationUpload() {
  const [state, action, pending] = useActionState(submitManualVerificationAction, manualInitialState);
  const [consented, setConsented] = useState(false);

  if (state.status === "success") {
    return <p className="text-sm text-success">{state.message}</p>;
  }

  return (
    <form action={action} className="space-y-4">
      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm">
        <p className="font-medium">What happens with manual review</p>
        <ul className="mt-2 space-y-1 text-muted-foreground">
          <li>• You upload a photo of a government-issued ID and a selfie</li>
          <li>• A team member compares them by eye and makes the call — there&apos;s no automated liveness check</li>
          <li>• We store both images only until that decision is made, then delete them</li>
        </ul>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="manual-document">Photo of your ID</Label>
        <Input id="manual-document" name="document" type="file" accept="image/jpeg,image/png,image/webp" required />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="manual-selfie">Selfie</Label>
        <Input id="manual-selfie" name="selfie" type="file" accept="image/jpeg,image/png,image/webp" required />
      </div>

      <Label className="flex items-start gap-2.5 text-sm font-normal">
        <Checkbox
          checked={consented}
          onCheckedChange={(v) => setConsented(v === true)}
          className="mt-0.5"
        />
        <span>
          I consent to submitting these images for manual identity review, and understand they&apos;re
          stored only until a team member reviews them, then deleted.
        </span>
      </Label>
      <input type="hidden" name="consent" value={consented ? "true" : "false"} />

      {state.status === "error" ? <p className="text-sm text-destructive">{state.message}</p> : null}

      <Button type="submit" variant="outline" disabled={pending || !consented}>
        <Upload className="size-4" />
        {pending ? "Uploading…" : "Submit for manual review"}
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
