"use client";

import { useActionState, useState } from "react";
import { Monitor } from "lucide-react";

import { signOutEverywhere, type SignOutEverywhereState } from "@/server/actions/sessions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: SignOutEverywhereState = { status: "idle" };

export type LoginEventSummary = {
  id: string;
  device: string;
  ipAddress: string | null;
  createdAt: string;
  isMostRecent: boolean;
};

function SignOutEverywhereFlow({ onCancel }: { onCancel: () => void }) {
  const [state, action, pending] = useActionState(signOutEverywhere, initial);

  return (
    <form action={action} className="space-y-3 rounded-lg border border-destructive/40 bg-destructive/5 p-4">
      <p className="text-sm">
        This signs out every device right now, including this one — you&apos;ll need to sign in again here too.
      </p>
      <Label htmlFor="signout-everywhere-password">Confirm your password</Label>
      <Input id="signout-everywhere-password" name="password" type="password" required autoComplete="current-password" />
      {state.status === "error" ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="destructive" disabled={pending}>
          {pending ? "Signing out…" : "Sign out everywhere"}
        </Button>
        <Button type="button" size="sm" variant="ghost" onClick={onCancel}>
          Cancel
        </Button>
      </div>
    </form>
  );
}

export function SessionsPanel({ recentLogins }: { recentLogins: LoginEventSummary[] }) {
  const [confirming, setConfirming] = useState(false);

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        {recentLogins.length === 0 ? (
          <p className="text-sm text-muted-foreground">No sign-in activity recorded yet.</p>
        ) : (
          recentLogins.map((event) => (
            <div key={event.id} className="flex items-center justify-between gap-3 rounded-lg border border-border p-3 text-sm">
              <div className="flex items-center gap-2.5">
                <Monitor className="size-4 shrink-0 text-muted-foreground" />
                <div>
                  <p className="font-medium">
                    {event.device}
                    {event.isMostRecent ? <span className="ml-2 text-xs text-success">Most recent</span> : null}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {event.ipAddress ?? "Unknown IP"} · {new Date(event.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      <p className="text-xs text-muted-foreground">
        Sessions here are per-account, not per-device — there&apos;s no way to end just one of these individually.
        If something looks wrong, end all of them and sign back in.
      </p>

      {confirming ? (
        <SignOutEverywhereFlow onCancel={() => setConfirming(false)} />
      ) : (
        <Button size="sm" variant="outline" onClick={() => setConfirming(true)}>
          Sign out everywhere
        </Button>
      )}
    </div>
  );
}
