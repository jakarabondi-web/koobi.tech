"use client";

import { useActionState, useState } from "react";

import { setSensitiveContentOptIn, type ActionState } from "@/server/actions/settings";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const initialState: ActionState = { status: "idle" };

export function SensitiveContentToggle({ initial }: { initial: boolean }) {
  const [state, formAction, pending] = useActionState(setSensitiveContentOptIn, initialState);
  const [optIn, setOptIn] = useState(initial);

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="optIn" value={String(optIn)} />
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-0.5">
          <Label htmlFor="sensitive">Sensitive content projects</Label>
          <p className="text-xs text-muted-foreground">
            Some safety and red-teaming projects involve distressing material. This is entirely
            optional and never affects your standing.
          </p>
        </div>
        <Switch id="sensitive" checked={optIn} onCheckedChange={setOptIn} />
      </div>
      {state.message ? (
        <p className={state.status === "error" ? "text-xs text-destructive" : "text-xs text-success"}>
          {state.message}
        </p>
      ) : null}
      <Button type="submit" variant="outline" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save preference"}
      </Button>
    </form>
  );
}

const CHANNELS = [
  ["new_project", "New projects matching my expertise"],
  ["task_reviewed", "My submissions are reviewed"],
  ["payment", "Payment and payout updates"],
  ["assessment", "Assessment results"],
  ["security", "Security alerts"],
] as const;

export function NotificationPreferences() {
  // Preference storage isn't implemented yet — these render disabled rather
  // than pretending to save, so the UI never claims more than it does.
  return (
    <div className="space-y-3">
      {CHANNELS.map(([key, label]) => (
        <div key={key} className="flex items-center justify-between gap-4">
          <Label htmlFor={key} className="font-normal">{label}</Label>
          <Switch id={key} defaultChecked disabled />
        </div>
      ))}
      <p className="text-xs text-muted-foreground">
        Per-channel preferences aren&apos;t configurable yet — all of these are currently on. Security
        alerts will always remain on.
      </p>
    </div>
  );
}
