import type { PayoutProvider, PayoutRequestInput, PayoutResult } from "./types";

/**
 * Stripe Connect payouts.
 *
 * MOCKED unless STRIPE_SECRET_KEY is set — see SECURITY.md. When mocked, no
 * network call is made and a clearly-prefixed fake reference is returned so
 * mock payouts are never mistaken for real ones in the database.
 */
export const stripeConnectProvider: PayoutProvider = {
  key: "STRIPE_CONNECT",
  label: "Stripe (bank transfer)",

  isMocked() {
    return !process.env.STRIPE_SECRET_KEY;
  },

  async send(input: PayoutRequestInput): Promise<PayoutResult> {
    const secretKey = process.env.STRIPE_SECRET_KEY;

    if (!secretKey) {
      console.warn(
        `[payments:stripe:mock] No STRIPE_SECRET_KEY — simulating payout of ${input.amountCents} ` +
          `${input.currency} to ${input.destination} (request ${input.payoutRequestId})`
      );
      return { ok: true, providerReference: `mock_stripe_${input.payoutRequestId}`, mocked: true };
    }

    // Stripe Transfers API: move funds from the platform balance to a
    // connected account. The connected account then pays out to its bank
    // on its own payout schedule.
    const body = new URLSearchParams({
      amount: String(input.amountCents),
      currency: input.currency.toLowerCase(),
      destination: input.destination,
      transfer_group: input.reference,
    });

    const res = await fetch("https://api.stripe.com/v1/transfers", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${secretKey}`,
        "Content-Type": "application/x-www-form-urlencoded",
        // Prevents a retried request from sending the money twice.
        "Idempotency-Key": input.payoutRequestId,
      },
      body,
    });

    const json = (await res.json()) as { id?: string; error?: { message?: string } };

    if (!res.ok || !json.id) {
      return {
        ok: false,
        failureReason: json.error?.message ?? `Stripe transfer failed (${res.status})`,
        mocked: false,
      };
    }

    return { ok: true, providerReference: json.id, mocked: false };
  },
};
