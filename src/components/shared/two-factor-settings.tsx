"use client";

import { useActionState, useState } from "react";
import { ShieldCheck, ShieldOff, Copy, Check } from "lucide-react";

import {
  confirmEnroll2fa,
  disable2fa,
  regenerateRecoveryCodes,
  startEnroll2fa,
  type ConfirmEnrollState,
  type DisableState,
  type RegenerateRecoveryCodesState,
} from "@/server/actions/two-factor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const confirmInitial: ConfirmEnrollState = { status: "idle" };
const disableInitial: DisableState = { status: "idle" };
const regenerateInitial: RegenerateRecoveryCodesState = { status: "idle" };

function RecoveryCodes({ codes }: { codes: string[] }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-warning/40 bg-warning/10 p-4">
      <p className="text-sm font-medium">Save your recovery codes</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Each works once, if you lose access to your authenticator app. Store them somewhere safe —
        they will not be shown again.
      </p>
      <div className="mt-3 grid grid-cols-2 gap-2 font-mono text-xs">
        {codes.map((c) => (
          <div key={c} className="rounded-md border border-border bg-background px-2 py-1.5">
            {c}
          </div>
        ))}
      </div>
      <Button
        type="button"
        size="sm"
        variant="outline"
        className="mt-3"
        onClick={async () => {
          await navigator.clipboard.writeText(codes.join("\n"));
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
      >
        {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
        {copied ? "Copied" : "Copy all"}
      </Button>
    </div>
  );
}

function EnrollFlow({ onDone }: { onDone: () => void }) {
  const [starting, setStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const [enroll, setEnroll] = useState<{ qrDataUrl: string; manualEntryKey: string } | null>(null);
  const [confirmState, confirmAction, confirming] = useActionState(confirmEnroll2fa, confirmInitial);

  async function begin() {
    setStarting(true);
    setStartError(null);
    const result = await startEnroll2fa();
    setStarting(false);
    if (result.status === "ready" && result.qrDataUrl && result.manualEntryKey) {
      setEnroll({ qrDataUrl: result.qrDataUrl, manualEntryKey: result.manualEntryKey });
    } else {
      setStartError(result.message ?? "Couldn't start enrollment.");
    }
  }

  if (confirmState.status === "success" && confirmState.recoveryCodes) {
    return (
      <div className="space-y-4">
        <p className="flex items-center gap-2 text-sm font-medium text-success">
          <ShieldCheck className="size-4" /> {confirmState.message}
        </p>
        <RecoveryCodes codes={confirmState.recoveryCodes} />
        <Button size="sm" onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }

  if (!enroll) {
    return (
      <div className="space-y-3">
        <p className="text-sm text-muted-foreground">
          Requires an authenticator app — Google Authenticator, 1Password, Authy, or similar.
        </p>
        {startError ? <p className="text-sm text-destructive">{startError}</p> : null}
        <Button size="sm" onClick={begin} disabled={starting}>
          {starting ? "Starting…" : "Set up two-factor authentication"}
        </Button>
      </div>
    );
  }

  return (
    <form action={confirmAction} className="space-y-4">
      <p className="text-sm text-muted-foreground">Scan this in your authenticator app:</p>
      {/* eslint-disable-next-line @next/next/no-img-element -- a locally generated data: URI, not a remote image Next's optimizer can process */}
      <img src={enroll.qrDataUrl} alt="Scan with your authenticator app" className="size-40 rounded-md border border-border" />
      <div>
        <p className="text-xs text-muted-foreground">Can&apos;t scan it? Enter this key manually:</p>
        <code className="mt-1 block break-all rounded-md border border-border bg-muted/40 px-2 py-1.5 text-xs">
          {enroll.manualEntryKey}
        </code>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="tfa-code">Code from your app</Label>
        <Input id="tfa-code" name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} required />
      </div>
      {confirmState.status === "error" ? (
        <p className="text-sm text-destructive">{confirmState.message}</p>
      ) : null}
      <Button type="submit" size="sm" disabled={confirming}>
        {confirming ? "Verifying…" : "Turn on two-factor authentication"}
      </Button>
    </form>
  );
}

function RegenerateFlow({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(regenerateRecoveryCodes, regenerateInitial);

  if (state.status === "success" && state.recoveryCodes) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-muted-foreground">{state.message}</p>
        <RecoveryCodes codes={state.recoveryCodes} />
        <Button size="sm" onClick={onDone}>
          Done
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <p className="text-sm text-muted-foreground">
        This replaces all of your existing recovery codes — any you saved before will stop working.
      </p>
      <Label htmlFor="tfa-regenerate-password">Confirm your password</Label>
      <Input id="tfa-regenerate-password" name="password" type="password" required autoComplete="current-password" />
      {state.status === "error" ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Regenerating…" : "Regenerate recovery codes"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onDone}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

function DisableFlow({ onDone }: { onDone: () => void }) {
  const [state, action, pending] = useActionState(disable2fa, disableInitial);

  if (state.status === "success") {
    onDone();
    return null;
  }

  return (
    <form action={action} className="space-y-3">
      <Label htmlFor="tfa-disable-password">Confirm your password to turn this off</Label>
      <Input id="tfa-disable-password" name="password" type="password" required autoComplete="current-password" />
      {state.status === "error" ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <Button type="submit" size="sm" variant="destructive" disabled={pending}>
        {pending ? "Turning off…" : "Turn off two-factor authentication"}
      </Button>
    </form>
  );
}

export function TwoFactorSettings({
  initiallyEnabled,
  recoveryCodesRemaining = 0,
}: {
  initiallyEnabled: boolean;
  /** Omitted for callers that don't have it handy — the count is only shown when known. */
  recoveryCodesRemaining?: number;
}) {
  const [enabled, setEnabled] = useState(initiallyEnabled);
  const [enrolling, setEnrolling] = useState(false);
  const [disabling, setDisabling] = useState(false);
  const [regenerating, setRegenerating] = useState(false);
  const [codesRemaining, setCodesRemaining] = useState(recoveryCodesRemaining);

  if (enabled && regenerating) {
    return (
      <RegenerateFlow
        onDone={() => {
          setCodesRemaining(10);
          setRegenerating(false);
        }}
      />
    );
  }

  if (enabled && !disabling) {
    return (
      <div className="space-y-3">
        <Badge variant="success" className="gap-1">
          <ShieldCheck className="size-3" /> Enabled
        </Badge>
        <p className="text-sm text-muted-foreground">
          Your account requires a code from your authenticator app to sign in.
        </p>
        <p className="text-sm text-muted-foreground">
          {codesRemaining} recovery {codesRemaining === 1 ? "code" : "codes"} remaining.{" "}
          {codesRemaining <= 2 ? (
            <span className="font-medium text-warning-foreground">Running low — consider regenerating.</span>
          ) : null}
        </p>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" variant="outline" onClick={() => setRegenerating(true)}>
            Regenerate recovery codes
          </Button>
          <Button size="sm" variant="outline" onClick={() => setDisabling(true)}>
            <ShieldOff className="size-4" /> Turn off
          </Button>
        </div>
      </div>
    );
  }

  if (disabling) {
    return (
      <DisableFlow
        onDone={() => {
          setEnabled(false);
          setDisabling(false);
        }}
      />
    );
  }

  if (enrolling) {
    return <EnrollFlow onDone={() => { setEnabled(true); setEnrolling(false); }} />;
  }

  return (
    <div className="space-y-3">
      <Badge variant="outline">Not enabled</Badge>
      <p className="text-sm text-muted-foreground">
        Add a second step at sign-in using an authenticator app on your phone.
      </p>
      <Button size="sm" onClick={() => setEnrolling(true)}>
        Set up two-factor authentication
      </Button>
    </div>
  );
}
