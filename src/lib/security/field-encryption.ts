import { createCipheriv, createDecipheriv, createHash, randomBytes } from "node:crypto";

/**
 * Narrow AES-256-GCM helper for the one field that needs it today: a user's
 * TOTP secret. This is not a general "field encryption" framework — a TOTP
 * secret is as sensitive as a password (whoever holds it can generate valid
 * codes forever), so it does not belong in the database in plaintext the way
 * an ordinary column does.
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

export function encryptSecret(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", encryptionKey(), iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, ciphertext].map((b) => b.toString("base64")).join(":");
}

export function decryptSecret(stored: string): string {
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
