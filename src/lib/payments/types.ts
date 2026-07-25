export type PayoutProviderKey = "STRIPE_CONNECT" | "MPESA";

export type PayoutRequestInput = {
  payoutRequestId: string;
  amountCents: number;
  currency: string;
  /** Stripe connected-account id, or the M-Pesa MSISDN, depending on provider. */
  destination: string;
  reference: string;
};

export type PayoutResult =
  | { ok: true; providerReference: string; mocked: boolean }
  | { ok: false; failureReason: string; mocked: boolean };

export interface PayoutProvider {
  readonly key: PayoutProviderKey;
  readonly label: string;
  /** True when the provider has no real credentials configured and is simulating. */
  isMocked(): boolean;
  send(input: PayoutRequestInput): Promise<PayoutResult>;
}
