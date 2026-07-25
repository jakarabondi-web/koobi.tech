"use client";

import { useActionState, useState } from "react";

import { approvePayout, declinePayout, type ActionState } from "@/server/actions/payouts";
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

export function PayoutActions({
  payoutRequestId,
  amountLabel,
  trainerName,
}: {
  payoutRequestId: string;
  amountLabel: string;
  trainerName: string;
}) {
  const [approveState, approveAction, approving] = useActionState(approvePayout, initialState);
  const [declineState, declineAction, declining] = useActionState(declinePayout, initialState);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [declineOpen, setDeclineOpen] = useState(false);

  return (
    <div className="flex items-center justify-end gap-2">
      {approveState.message ? (
        <span
          className={
            approveState.status === "error" ? "text-xs text-destructive" : "text-xs text-success"
          }
        >
          {approveState.message}
        </span>
      ) : null}
      {declineState.message ? (
        <span className="text-xs text-muted-foreground">{declineState.message}</span>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="violet">
            Approve & send
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send {amountLabel} to {trainerName}?</DialogTitle>
            <DialogDescription>
              This releases funds to the trainer&apos;s chosen payout provider. Payouts cannot be
              reversed from this screen once sent.
            </DialogDescription>
          </DialogHeader>
          <form action={approveAction}>
            <input type="hidden" name="payoutRequestId" value={payoutRequestId} />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setConfirmOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="violet" disabled={approving}>
                {approving ? "Sending…" : "Confirm and send"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={declineOpen} onOpenChange={setDeclineOpen}>
        <DialogTrigger asChild>
          <Button size="sm" variant="outline">
            Decline
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Decline payout request</DialogTitle>
            <DialogDescription>
              The trainer is notified with your reason, and their earnings return to their available
              balance.
            </DialogDescription>
          </DialogHeader>
          <form action={declineAction} className="space-y-4">
            <input type="hidden" name="payoutRequestId" value={payoutRequestId} />
            <Input name="reason" placeholder="Reason shown to the trainer" required />
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeclineOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="destructive" disabled={declining}>
                {declining ? "Declining…" : "Decline request"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
