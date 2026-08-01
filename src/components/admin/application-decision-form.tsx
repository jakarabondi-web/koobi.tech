"use client";

import { useActionState, useState } from "react";

import { matchApplicationAction, rejectApplicationAction, type ActionState } from "@/server/actions/assignment";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initial: ActionState = { status: "idle" };

export function ApplicationDecisionForm({ applicationId, projectId }: { applicationId: string; projectId: string }) {
  const [choice, setChoice] = useState<"match" | "reject" | null>(null);
  const [matchState, matchAction, matchPending] = useActionState(matchApplicationAction, initial);
  const [rejectState, rejectAction, rejectPending] = useActionState(rejectApplicationAction, initial);

  if (matchState.status === "success") return <p className="text-xs text-success">{matchState.message}</p>;
  if (rejectState.status === "success") return <p className="text-xs text-success">{rejectState.message}</p>;

  if (choice === null) {
    return (
      <div className="flex gap-2">
        <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={() => setChoice("match")}>
          Match
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setChoice("reject")}>
          Reject
        </Button>
      </div>
    );
  }

  if (choice === "match") {
    return (
      <form action={matchAction} className="space-y-2">
        <input type="hidden" name="applicationId" value={applicationId} />
        <input type="hidden" name="projectId" value={projectId} />
        <p className="text-xs text-muted-foreground">
          This assigns them to the project and grants task access immediately.
        </p>
        {matchState.status === "error" ? <p className="text-xs text-destructive">{matchState.message}</p> : null}
        <div className="flex gap-2">
          <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={matchPending}>
            {matchPending ? "Matching…" : "Confirm match"}
          </Button>
          <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setChoice(null)}>
            Cancel
          </Button>
        </div>
      </form>
    );
  }

  return (
    <form action={rejectAction} className="space-y-2">
      <input type="hidden" name="applicationId" value={applicationId} />
      <input type="hidden" name="projectId" value={projectId} />
      <Textarea name="reason" rows={2} placeholder="Optional reason…" className="text-xs" />
      {rejectState.status === "error" ? <p className="text-xs text-destructive">{rejectState.message}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={rejectPending}>
          {rejectPending ? "Saving…" : "Confirm reject"}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setChoice(null)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
