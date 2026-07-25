import { mpesaProvider } from "./mpesa";
import { stripeConnectProvider } from "./stripe-connect";
import type { PayoutProvider, PayoutProviderKey } from "./types";

const PROVIDERS: Record<PayoutProviderKey, PayoutProvider> = {
  STRIPE_CONNECT: stripeConnectProvider,
  MPESA: mpesaProvider,
};

export function getPayoutProvider(key: PayoutProviderKey): PayoutProvider {
  return PROVIDERS[key];
}

export function listPayoutProviders(): PayoutProvider[] {
  return Object.values(PROVIDERS);
}

export type { PayoutProvider, PayoutProviderKey, PayoutResult, PayoutRequestInput } from "./types";
