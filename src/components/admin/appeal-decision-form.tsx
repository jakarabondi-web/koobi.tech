"use client";

import { useActionState, useState } from "react";

import { decideAppealAction, type DecideAppealState } from "@/server/actions/appeals";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initial: DecideAppealState = { status: "idle" };

export function AppealDecisionForm({ appealId }: { appealId: string }) {
  const [outcome, setOutcome] = useState<"UPHELD" | "OVERTURNED" | null>(null);
  const [state, action, pending] = useActionState(decideAppealAction, initial);

  if (state.status === "success") {
    return <p className="text-xs text-success">{state.message}</p>;
  }

  if (!outcome) {
    return (
      <div className="flex gap-2">
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setOutcome("OVERTURNED")}>
          Overturn
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setOutcome("UPHELD")}>
          Uphold
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="appealId" value={appealId} />
      <input type="hidden" name="outcome" value={outcome} />
      <Textarea
        name="decision"
        rows={2}
        required
        placeholder={outcome === "OVERTURNED" ? "Why the original decision was wrong…" : "Why the original decision stands…"}
        className="text-xs"
      />
      {state.status === "error" ? <p className="text-xs text-destructive">{state.message}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={pending}>
          {pending ? "Saving…" : `Confirm ${outcome === "OVERTURNED" ? "overturn" : "uphold"}`}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setOutcome(null)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
