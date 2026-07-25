import { personaProvider } from "./persona";
import type { IdentityProvider } from "./types";

/**
 * Returns the configured identity provider. Add further vendors (Veriff,
 * Onfido, Stripe Identity) by implementing the IdentityProvider contract and
 * selecting them here via IDENTITY_PROVIDER.
 */
export function getIdentityProvider(): IdentityProvider {
  switch (process.env.IDENTITY_PROVIDER) {
    case "PERSONA":
    default:
      return personaProvider;
  }
}

export type {
  IdentityProvider,
  IdentityProviderKey,
  VerificationDecision,
  VerificationSession,
  CheckOutcome,
} from "./types";
