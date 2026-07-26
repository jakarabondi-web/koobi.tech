import { describe, expect, it } from "vitest";

import {
  consumeRecoveryCode,
  generateRecoveryCodes,
  generateTotpCode,
  generateTotpSecret,
  hashRecoveryCode,
  totpUri,
  verifyTotpCode,
} from "@/lib/auth/two-factor";
import { decryptSecret, encryptSecret } from "@/lib/security/field-encryption";

describe("field encryption", () => {
  it("round-trips a secret", () => {
    const encrypted = encryptSecret("JBSWY3DPEHPK3PXP");
    expect(decryptSecret(encrypted)).toBe("JBSWY3DPEHPK3PXP");
  });

  it("never stores the plaintext inside the ciphertext string", () => {
    const encrypted = encryptSecret("JBSWY3DPEHPK3PXP");
    expect(encrypted).not.toContain("JBSWY3DPEHPK3PXP");
  });

  it("produces a different ciphertext each time (random IV)", () => {
    expect(encryptSecret("same-secret")).not.toBe(encryptSecret("same-secret"));
  });

  it("rejects a tampered ciphertext rather than returning garbage", () => {
    const encrypted = encryptSecret("JBSWY3DPEHPK3PXP");
    const [iv, tag, ciphertext] = encrypted.split(":");
    const flipped = Buffer.from(ciphertext, "base64");
    flipped[0] ^= 0xff;
    const tampered = [iv, tag, flipped.toString("base64")].join(":");
    expect(() => decryptSecret(tampered)).toThrow();
  });
});

describe("TOTP", () => {
  it("verifies a code generated from its own secret", async () => {
    const secret = await generateTotpSecret();
    const code = await generateTotpCode(secret);
    expect(await verifyTotpCode(secret, code)).toBe(true);
  });

  it("rejects a code generated from a different secret", async () => {
    const secretA = await generateTotpSecret();
    const secretB = await generateTotpSecret();
    const code = await generateTotpCode(secretB);
    expect(await verifyTotpCode(secretA, code)).toBe(false);
  });

  it("rejects malformed input without throwing", async () => {
    const secret = await generateTotpSecret();
    for (const bad of ["", "12345", "abcdef", "1234567", "123 456"]) {
      expect(await verifyTotpCode(secret, bad), bad).toBe(false);
    }
  });

  it("tolerates realistic clock drift", async () => {
    // The bug this guards: epochTolerance is denominated in seconds, not
    // time steps. Passing "1" meaning "one 30s step" accepted almost no
    // real skew — this must accept a code generated 30s ago or from now.
    const secret = await generateTotpSecret();
    const now = Math.floor(Date.now() / 1000);
    const drifted = await import("otplib").then((otp) =>
      otp.generate({ secret, epoch: now - 25 })
    );
    expect(await verifyTotpCode(secret, drifted)).toBe(true);
  });

  it("rejects a code far outside any tolerance window", async () => {
    const secret = await generateTotpSecret();
    const now = Math.floor(Date.now() / 1000);
    const stale = await import("otplib").then((otp) => otp.generate({ secret, epoch: now - 600 }));
    expect(await verifyTotpCode(secret, stale)).toBe(false);
  });

  it("builds a provisioning URI carrying the brand name and the account email", async () => {
    const secret = await generateTotpSecret();
    const uri = await totpUri(secret, "person@example.com");
    expect(uri).toMatch(/^otpauth:\/\/totp\//);
    expect(uri).toContain(encodeURIComponent("person@example.com"));
    expect(uri).toContain("Traivr");
  });
});

describe("recovery codes", () => {
  it("generates ten codes, each hashing to a distinct value", () => {
    const { plaintext, hashed } = generateRecoveryCodes();
    expect(plaintext).toHaveLength(10);
    expect(new Set(hashed).size).toBe(10);
  });

  it("formats every code as exactly xxxx-xxxx", () => {
    const { plaintext } = generateRecoveryCodes();
    for (const code of plaintext) {
      expect(code).toMatch(/^[0-9a-f]{4}-[0-9a-f]{4}$/);
    }
  });

  it("hashes case- and whitespace-insensitively, matching how a person types it", () => {
    expect(hashRecoveryCode("ABCD-1234")).toBe(hashRecoveryCode(" abcd-1234 "));
  });

  it("consumes a valid code and removes only that one", () => {
    const { plaintext, hashed } = generateRecoveryCodes();
    const result = consumeRecoveryCode(hashed, plaintext[3]);
    expect(result.valid).toBe(true);
    expect(result.remaining).toHaveLength(9);
    expect(result.remaining).not.toContain(hashRecoveryCode(plaintext[3]));
  });

  it("rejects a code that was never issued, and changes nothing", () => {
    const { hashed } = generateRecoveryCodes();
    const result = consumeRecoveryCode(hashed, "0000-0000");
    expect(result.valid).toBe(false);
    expect(result.remaining).toEqual(hashed);
  });

  it("cannot be replayed once removed", () => {
    const { plaintext, hashed } = generateRecoveryCodes();
    const first = consumeRecoveryCode(hashed, plaintext[0]);
    const second = consumeRecoveryCode(first.remaining, plaintext[0]);
    expect(second.valid).toBe(false);
  });
});
