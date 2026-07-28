const EXPIRING_SOON_DAYS = 30;

export type CredentialExpiryStatus = "none" | "valid" | "expiring_soon" | "expired";

/**
 * Classifies a credential's expiry date relative to now. `expiresAt` being
 * null means the credential never records an expiry (e.g. verification was
 * never completed, or the identity provider didn't return one) — treated
 * as "none," not "valid," so callers don't read silence as a guarantee.
 */
export function credentialExpiryStatus(expiresAt: Date | null, now = new Date()): CredentialExpiryStatus {
  if (!expiresAt) return "none";
  if (expiresAt <= now) return "expired";
  const daysUntil = (expiresAt.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
  return daysUntil <= EXPIRING_SOON_DAYS ? "expiring_soon" : "valid";
}

export function daysUntil(date: Date, now = new Date()): number {
  return Math.ceil((date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
}
