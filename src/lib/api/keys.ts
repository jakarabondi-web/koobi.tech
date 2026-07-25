import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

/**
 * API key format and hashing.
 *
 * Keys are hashed with SHA-256 rather than bcrypt. That is the right choice
 * *only* because the secret is a 32-byte random value we generate ourselves:
 * there is no dictionary to attack, so the slow-hash property bcrypt buys for
 * human-chosen passwords is worthless here, while bcrypt's cost would be paid
 * on every single API request. Never reuse this module for passwords.
 */

const PREFIX = "tra";
/** Length of the non-secret identifier segment stored alongside the hash. */
const LABEL_BYTES = 4;
const SECRET_BYTES = 32;

export type GeneratedKey = {
  /** Shown to the client exactly once. */
  plaintext: string;
  hashedKey: string;
  /** Safe to display and log. */
  prefix: string;
};

export function generateApiKey(environment: "live" | "test" = "live"): GeneratedKey {
  const label = randomBytes(LABEL_BYTES).toString("hex");
  const secret = randomBytes(SECRET_BYTES).toString("base64url");
  const prefix = `${PREFIX}_${environment}_${label}`;
  const plaintext = `${prefix}_${secret}`;

  return { plaintext, hashedKey: hashApiKey(plaintext), prefix };
}

export function hashApiKey(plaintext: string): string {
  return createHash("sha256").update(plaintext).digest("hex");
}

/** Cheap shape check so malformed input never reaches the database. */
export function looksLikeApiKey(value: string): boolean {
  return /^tra_(live|test)_[0-9a-f]{8}_[A-Za-z0-9_-]{20,}$/.test(value);
}

export function prefixOf(plaintext: string): string {
  return plaintext.split("_").slice(0, 3).join("_");
}

/**
 * Constant-time comparison of two hex digests.
 *
 * The lookup itself is by unique index, so this is belt-and-braces — but a
 * digest comparison that short-circuits is exactly the kind of detail that
 * becomes a real timing oracle once someone refactors the lookup.
 */
export function digestsMatch(a: string, b: string): boolean {
  const bufA = Buffer.from(a, "hex");
  const bufB = Buffer.from(b, "hex");
  if (bufA.length !== bufB.length || bufA.length === 0) return false;
  return timingSafeEqual(bufA, bufB);
}

/**
 * Extracts a bearer token from an Authorization header.
 * Returns null for any other scheme — we never accept a raw key.
 */
export function bearerFrom(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}
