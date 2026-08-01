"use client";

import { useActionState, useState } from "react";

import { reviewVerificationAction, type ActionState } from "@/server/actions/identity-verification";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initial: ActionState = { status: "idle" };

export function IdentityReviewForm({ userId }: { userId: string }) {
  const [approve, setApprove] = useState<"true" | "false" | null>(null);
  const [state, action, pending] = useActionState(reviewVerificationAction, initial);

  if (state.status === "success") {
    return <p className="text-xs text-success">{state.message}</p>;
  }

  if (approve === null) {
    return (
      <div className="flex gap-2">
        <Button type="button" size="sm" className="h-7 px-2 text-xs" onClick={() => setApprove("true")}>
          Approve
        </Button>
        <Button type="button" size="sm" variant="outline" className="h-7 px-2 text-xs" onClick={() => setApprove("false")}>
          Reject
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="approve" value={approve} />
      <Textarea
        name="notes"
        rows={2}
        required
        placeholder={approve === "true" ? "Notes for the record…" : "Reason shown to the trainer…"}
        className="text-xs"
      />
      {state.status === "error" ? <p className="text-xs text-destructive">{state.message}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={pending}>
          {pending ? "Saving…" : `Confirm ${approve === "true" ? "approval" : "rejection"}`}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setApprove(null)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
