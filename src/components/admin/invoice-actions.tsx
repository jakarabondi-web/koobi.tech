"use client";

import { useActionState, useState } from "react";

import { markPaidAction, markSentAction, voidAction, type ActionState } from "@/server/actions/invoices";
import { Button } from "@/components/ui/button";
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

function ActionDialog({
  invoiceId,
  label,
  title,
  description,
  action,
  variant,
}: {
  invoiceId: string;
  label: string;
  title: string;
  description: string;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  variant: "outline" | "destructive" | "violet";
}) {
  const [state, formAction, pending] = useActionState(action, initialState);
  const [open, setOpen] = useState(false);

  if (state.status === "success") return <span className="text-xs text-success">{state.message}</span>;

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={variant}>{label}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <form action={formAction}>
          <input type="hidden" name="invoiceId" value={invoiceId} />
          {state.status === "error" ? <p className="mb-2 text-xs text-destructive">{state.message}</p> : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant={variant} disabled={pending}>
              {pending ? "Saving…" : `Confirm ${label.toLowerCase()}`}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function InvoiceActions({ invoiceId, status }: { invoiceId: string; status: string }) {
  return (
    <div className="flex justify-end gap-2">
      {status === "DRAFT" ? (
        <ActionDialog
          invoiceId={invoiceId}
          label="Mark sent"
          title="Mark this invoice sent?"
          description="This marks the invoice as issued to the client."
          action={markSentAction}
          variant="violet"
        />
      ) : null}
      {status === "SENT" || status === "OVERDUE" ? (
        <ActionDialog
          invoiceId={invoiceId}
          label="Mark paid"
          title="Mark this invoice paid?"
          description="This records the invoice as paid. Use this once payment is confirmed."
          action={markPaidAction}
          variant="violet"
        />
      ) : null}
      {status === "DRAFT" || status === "SENT" ? (
        <ActionDialog
          invoiceId={invoiceId}
          label="Void"
          title="Void this invoice?"
          description="This permanently voids the invoice. It won't be billed to the client."
          action={voidAction}
          variant="destructive"
        />
      ) : null}
    </div>
  );
}
