import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * AES-256-GCM helper for columns that hold something more sensitive than
 * ordinary application data: a user's TOTP secret, a payout phone number, a
 * login IP. Deliberately still narrow — reach for this only for a specific
 * column you can name a real harm for if it leaked (account takeover,
 * financial-account correlation), not as a default for every string field.
 *
 * The key is derived from AUTH_SECRET rather than a separate variable. That
 * secret already has the two properties this needs — present in every
 * environment, and rotated per-deployment — and asking for a second secret
 * just for this would be one more way to misconfigure a deployment.
 */

function encryptionKey(): Buffer {
  const secret = process.env.AUTH_SECRET;
  if (!secret) {
    throw new Error("AUTH_SECRET must be set to encrypt or decrypt a TOTP secret.");
  }
  return createHash("sha256").update(secret).digest();
}

export function encryptField(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((b) => b.toString("base64")).join(":");
}

export function decryptField(stored: string): string {
  const [ivB64, tagB64, ciphertextB64] = stored.split(":");
  if (!ivB64 || !tagB64 || !ciphertextB64) {
    throw new Error("Malformed encrypted value.");
  }
  const decipher = createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(ivB64, "base64"));
  decipher.setAuthTag(Buffer.from(tagB64, "base64"));
  const plaintext = Buffer.concat([
    decipher.update(Buffer.from(ciphertextB64, "base64")),
    decipher.final(),
  ]);
  return plaintext.toString("utf8");
}

/**
 * Same as `decryptField`, but falls back to returning the stored value
 * as-is when it isn't in our ciphertext format — for a column that started
 * out unencrypted and only began encrypting on write from some point
 * forward (a payout phone number, a login IP). Rows written before that
 * point are still plaintext in the database and always will be; strict
 * `decryptField` throws on those, so a display path built on it would 500
 * for any account with pre-encryption history.
 *
 * Do not use this for a column that has been encrypted since it was
 * introduced (the TOTP secret) — there, a decrypt failure is a real
 * integrity problem, not an expected legacy value, and should throw.
 */
export function decryptFieldOrLegacy(stored: string): string {
  try {
    return decryptField(stored);
  } catch {
    return stored;
  }
}
