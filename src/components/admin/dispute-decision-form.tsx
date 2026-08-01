"use client";

import { useActionState, useState } from "react";

import { resolveDisputeAction, type ActionState } from "@/server/actions/disputes";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initial: ActionState = { status: "idle" };

export function DisputeDecisionForm({ disputeId }: { disputeId: string }) {
  const [outcome, setOutcome] = useState<"RESOLVED_APPROVED" | "RESOLVED_DENIED" | null>(null);
  const [state, action, pending] = useActionState(resolveDisputeAction, initial);

  if (state.status === "success") {
    return <p className="text-xs text-success">{state.message}</p>;
  }

  if (!outcome) {
    return (
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setOutcome("RESOLVED_APPROVED")}>
          Approve
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setOutcome("RESOLVED_DENIED")}>
          Deny
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="disputeId" value={disputeId} />
      <input type="hidden" name="outcome" value={outcome} />
      <Textarea
        name="decision"
        rows={2}
        required
        placeholder={outcome === "RESOLVED_APPROVED" ? "Why this dispute is being approved…" : "Why this dispute is being denied…"}
        className="text-xs"
      />
      {state.status === "error" ? <p className="text-xs text-destructive">{state.message}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={pending}>
          {pending ? "Saving…" : `Confirm ${outcome === "RESOLVED_APPROVED" ? "approval" : "denial"}`}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setOutcome(null)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
