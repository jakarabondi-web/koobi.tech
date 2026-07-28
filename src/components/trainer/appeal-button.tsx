"use client";

import { useActionState, useState } from "react";
import { Flag } from "lucide-react";

import { submitAppealAction, type SubmitAppealState } from "@/server/actions/appeals";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

const initial: SubmitAppealState = { status: "idle" };

/** An existing appeal's status, when the reviewer already knows about one. */
export type ExistingAppealStatus = "OPEN" | "UNDER_REVIEW" | "UPHELD" | "OVERTURNED" | "WITHDRAWN";

const STATUS_LABEL: Record<ExistingAppealStatus, string> = {
  OPEN: "Appeal pending review",
  UNDER_REVIEW: "Appeal under review",
  UPHELD: "Appeal reviewed — original decision stands",
  OVERTURNED: "Appeal reviewed — decision overturned",
  WITHDRAWN: "Appeal withdrawn",
};

export function AppealButton({ reviewId, existingStatus }: { reviewId: string; existingStatus?: ExistingAppealStatus }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(submitAppealAction, initial);

  if (existingStatus) {
    return <p className="text-xs text-muted-foreground">{STATUS_LABEL[existingStatus]}</p>;
  }

  if (state.status === "success") {
    return <p className="text-xs text-success">{state.message}</p>;
  }

  if (!open) {
    return (
      <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setOpen(true)}>
        <Flag className="size-3" /> Appeal this decision
      </Button>
    );
  }

  return (
    <form action={action} className="space-y-2">
      <input type="hidden" name="reviewId" value={reviewId} />
      <Textarea
        name="reason"
        rows={3}
        required
        placeholder="What do you think the reviewer got wrong? Be specific."
        className="text-xs"
      />
      {state.status === "error" ? <p className="text-xs text-destructive">{state.message}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" className="h-7 px-2 text-xs" disabled={pending}>
          {pending ? "Submitting…" : "Submit appeal"}
        </Button>
        <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setOpen(false)}>
          Cancel
        </Button>
      </div>
    </form>
  );
}
