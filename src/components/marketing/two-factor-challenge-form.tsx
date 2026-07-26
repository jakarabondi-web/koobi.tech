"use client";

import { useActionState, useState } from "react";

import {
  completeTwoFactorChallenge,
  type TwoFactorChallengeState,
} from "@/server/actions/two-factor-challenge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initial: TwoFactorChallengeState = { status: "idle" };

export function TwoFactorChallengeForm({ challenge }: { challenge: string }) {
  const [state, action, pending] = useActionState(completeTwoFactorChallenge, initial);
  const [useRecovery, setUseRecovery] = useState(false);

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="challenge" value={challenge} />
      <div className="space-y-1.5">
        <Label htmlFor="tfa-challenge-code">
          {useRecovery ? "Recovery code" : "Code from your authenticator app"}
        </Label>
        <Input
          id="tfa-challenge-code"
          name="code"
          autoComplete="one-time-code"
          autoFocus
          required
          inputMode={useRecovery ? "text" : "numeric"}
          maxLength={useRecovery ? 9 : 6}
          placeholder={useRecovery ? "xxxx-xxxx" : "123456"}
        />
      </div>
      {state.status === "error" ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Verifying…" : "Verify"}
      </Button>
      <button
        type="button"
        onClick={() => setUseRecovery((v) => !v)}
        className="w-full text-center text-sm text-muted-foreground hover:underline"
      >
        {useRecovery ? "Use my authenticator app instead" : "Use a recovery code instead"}
      </button>
    </form>
  );
}
