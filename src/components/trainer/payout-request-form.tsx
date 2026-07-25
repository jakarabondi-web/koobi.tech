"use client";

import { useActionState } from "react";

import { submitPayoutRequest, type ActionState } from "@/server/actions/payouts";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";

const initialState: ActionState = { status: "idle" };

export type PayoutMethodOption = { id: string; label: string };

export function PayoutRequestForm({
  methods,
  availableCents,
  minCents,
}: {
  methods: PayoutMethodOption[];
  availableCents: number;
  minCents: number;
}) {
  const [state, formAction, pending] = useActionState(submitPayoutRequest, initialState);
  const belowMinimum = availableCents < minCents;

  if (methods.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add an M-Pesa or Stripe payout method below before requesting a payout.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-1.5">
        <Label htmlFor="paymentAccountId">Pay out to</Label>
        <select
          id="paymentAccountId"
          name="paymentAccountId"
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        >
          {methods.map((m) => (
            <option key={m.id} value={m.id}>
              {m.label}
            </option>
          ))}
        </select>
      </div>

      {state.status !== "idle" && state.message ? (
        <p className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-success"}>
          {state.message}
        </p>
      ) : null}

      <Button type="submit" variant="violet" className="w-full" disabled={pending || belowMinimum}>
        {pending
          ? "Submitting…"
          : `Request payout of $${(availableCents / 100).toFixed(2)}`}
      </Button>

      {belowMinimum ? (
        <p className="text-xs text-muted-foreground">
          Minimum payout is ${(minCents / 100).toFixed(2)}. Keep completing tasks to reach it.
        </p>
      ) : null}
    </form>
  );
}
