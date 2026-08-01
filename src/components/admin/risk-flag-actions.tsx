"use client";

import { useActionState, useState } from "react";

import { resolveRiskFlagAction, type ActionState } from "@/server/actions/fraud";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: ActionState = { status: "idle" };

function ResolveDialog({
  flagId,
  outcome,
  label,
  triggerVariant,
  description,
}: {
  flagId: string;
  outcome: "REVIEWED" | "DISMISSED" | "ACTION_TAKEN";
  label: string;
  triggerVariant: "outline" | "destructive";
  description: string;
}) {
  const [state, action, pending] = useActionState(resolveRiskFlagAction, initialState);
  const [open, setOpen] = useState(false);

  if (state.status === "success") return <span className="text-xs text-success">{state.message}</span>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={triggerVariant} className="h-7 px-2 text-xs">{label}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{label} this flag?</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={action} className="space-y-4">
          <input type="hidden" name="flagId" value={flagId} />
          <input type="hidden" name="outcome" value={outcome} />
          <Input name="notes" placeholder="Notes for the record" required />
          {state.status === "error" ? <p className="text-xs text-destructive">{state.message}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant={triggerVariant === "destructive" ? "destructive" : "default"} disabled={pending}>
              {pending ? "Saving…" : `Confirm ${label.toLowerCase()}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function RiskFlagActions({ flagId }: { flagId: string }) {
  return (
    <div className="flex justify-end gap-2">
      <ResolveDialog
        flagId={flagId}
        outcome="REVIEWED"
        label="Review"
        triggerVariant="outline"
        description="Marks this signal as looked at with no enforcement action taken."
      />
      <ResolveDialog
        flagId={flagId}
        outcome="DISMISSED"
        label="Dismiss"
        triggerVariant="outline"
        description="Marks this signal as a false positive or otherwise not actionable."
      />
      <ResolveDialog
        flagId={flagId}
        outcome="ACTION_TAKEN"
        label="Action taken"
        triggerVariant="destructive"
        description="Records that enforcement was taken on the account for this signal. This doesn't itself suspend the account — do that separately on the trainer's page."
      />
    </div>
  );
}
