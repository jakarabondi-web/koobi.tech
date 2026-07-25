/**
 * Identity verification provider contract.
 *
 * PRIVACY BOUNDARY — read before implementing a provider:
 * Providers must return *decisions* only. Never return, log, or persist
 * document images, selfies, face embeddings, or biometric templates through
 * this interface. Those artifacts stay with the vendor, which keeps the
 * platform out of scope for most BIPA / GDPR Art. 9 biometric obligations.
 * See SECURITY.md.
 */

export type IdentityProviderKey = "PERSONA" | "VERIFF" | "ONFIDO" | "STRIPE_IDENTITY";

export type CheckOutcome = "PASS" | "FAIL" | "UNAVAILABLE";

/** A hosted verification session the applicant is redirected into. */
export type VerificationSession = {
  sessionId: string;
  /** Vendor-hosted capture URL — capture never happens on our origin. */
  redirectUrl: string;
  expiresAt: Date;
  mocked: boolean;
};

export type VerificationDecision = {
  sessionId: string;
  status: "VERIFIED" | "REJECTED" | "NEEDS_REVIEW" | "PENDING";
  documentType?: string;
  /** ISO-3166 alpha-2 read from the document. Used for jurisdiction checks. */
  documentCountry?: string;
  documentAuthentic: CheckOutcome;
  /** Active liveness / presentation-attack detection result. */
  livenessPassed: CheckOutcome;
  /** 1:1 selfie ↔ document portrait match. */
  faceMatchPassed: CheckOutcome;
  faceMatchScore?: number;
  /** 1:N search against already-verified users — duplicate-account signal. */
  duplicateCheckPassed: CheckOutcome;
  reason?: string;
  mocked: boolean;
};

export interface IdentityProvider {
  readonly key: IdentityProviderKey;
  readonly label: string;
  isMocked(): boolean;
  createSession(input: {
    userId: string;
    email: string;
    returnUrl: string;
  }): Promise<VerificationSession>;
  getDecision(sessionId: string): Promise<VerificationDecision>;
}
