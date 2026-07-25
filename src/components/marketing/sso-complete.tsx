"use client";

import { useActionState, useEffect, useRef } from "react";

import { completeSsoSignIn, type SsoSignInState } from "@/server/actions/sso-signin";
import { Button } from "@/components/ui/button";

const initial: SsoSignInState = { status: "idle" };

/**
 * Auto-submits the ticket so the sign-in completes without a click. The
 * visible button is the fallback for anyone whose browser blocks the
 * automatic submit — the flow must not dead-end there.
 */
export function SsoComplete({ ticket }: { ticket: string }) {
  const [state, action, pending] = useActionState(completeSsoSignIn, initial);
  const formRef = useRef<HTMLFormElement>(null);
  const submitted = useRef(false);

  useEffect(() => {
    if (submitted.current) return;
    submitted.current = true;
    formRef.current?.requestSubmit();
  }, []);

  return (
    <form ref={formRef} action={action} className="space-y-4">
      <input type="hidden" name="ticket" value={ticket} />
      {state.status === "error" ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : (
        <p className="text-sm text-muted-foreground">
          {pending ? "Completing sign-in…" : "Finishing up…"}
        </p>
      )}
      <Button type="submit" className="w-full" disabled={pending}>
        Continue
      </Button>
    </form>
  );
}
