"use client";

import { useActionState, useState } from "react";

import { addPaymentMethod, type ActionState } from "@/server/actions/payouts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

const initialState: ActionState = { status: "idle" };

export function AddPaymentMethodForm() {
  const [state, formAction, pending] = useActionState(addPaymentMethod, initialState);
  const [provider, setProvider] = useState<"MPESA" | "STRIPE_CONNECT">("MPESA");

  return (
    <form action={formAction} className="space-y-4">
      <div className="space-y-1.5">
        <Label>Payout method</Label>
        <RadioGroup
          name="provider"
          value={provider}
          onValueChange={(v) => setProvider(v as "MPESA" | "STRIPE_CONNECT")}
          className="grid grid-cols-2 gap-2"
        >
          <Label className="flex cursor-pointer items-center gap-2 rounded-md border border-input p-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent">
            <RadioGroupItem value="MPESA" />
            M-Pesa
          </Label>
          <Label className="flex cursor-pointer items-center gap-2 rounded-md border border-input p-3 text-sm has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-accent">
            <RadioGroupItem value="STRIPE_CONNECT" />
            Bank via Stripe
          </Label>
        </RadioGroup>
      </div>

      {provider === "MPESA" ? (
        <div className="space-y-1.5">
          <Label htmlFor="phone">M-Pesa phone number</Label>
          <Input id="phone" name="phone" inputMode="tel" placeholder="0712 345 678" required />
          <p className="text-xs text-muted-foreground">Kenyan Safaricom number registered for M-Pesa.</p>
        </div>
      ) : (
        <div className="space-y-1.5">
          <Label htmlFor="accountId">Stripe connected account ID</Label>
          <Input id="accountId" name="accountId" placeholder="acct_…" required />
          <p className="text-xs text-muted-foreground">
            Found in your Stripe dashboard after completing Connect onboarding.
          </p>
        </div>
      )}

      {state.status !== "idle" && state.message ? (
        <p className={state.status === "error" ? "text-sm text-destructive" : "text-sm text-success"}>
          {state.message}
        </p>
      ) : null}

      <Button type="submit" variant="outline" disabled={pending}>
        {pending ? "Adding…" : "Add payout method"}
      </Button>
    </form>
  );
}
