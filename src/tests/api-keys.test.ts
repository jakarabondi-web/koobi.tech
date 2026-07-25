import { describe, expect, it } from "vitest";

import {
  bearerFrom,
  digestsMatch,
  generateApiKey,
  hashApiKey,
  looksLikeApiKey,
  prefixOf,
} from "@/lib/api/keys";

describe("generateApiKey", () => {
  it("produces a key matching its own format check", () => {
    const key = generateApiKey();
    expect(looksLikeApiKey(key.plaintext)).toBe(true);
  });

  it("stores a hash, never the secret", () => {
    const key = generateApiKey();
    expect(key.hashedKey).not.toContain(key.plaintext);
    expect(key.hashedKey).toMatch(/^[0-9a-f]{64}$/);
  });

  it("exposes a prefix that is a strict, non-secret leading segment", () => {
    const key = generateApiKey();
    expect(key.plaintext.startsWith(key.prefix)).toBe(true);
    expect(key.prefix.length).toBeLessThan(key.plaintext.length);
    expect(prefixOf(key.plaintext)).toBe(key.prefix);
  });

  it("never repeats a key", () => {
    const seen = new Set(Array.from({ length: 200 }, () => generateApiKey().plaintext));
    expect(seen.size).toBe(200);
  });

  it("tags the environment so a test key is recognisable at a glance", () => {
    expect(generateApiKey("test").prefix).toMatch(/^tra_test_/);
    expect(generateApiKey("live").prefix).toMatch(/^tra_live_/);
  });
});

describe("hashApiKey", () => {
  it("is deterministic, so a presented key finds its row", () => {
    const key = generateApiKey();
    expect(hashApiKey(key.plaintext)).toBe(key.hashedKey);
  });

  it("changes completely for a one-character difference", () => {
    const a = hashApiKey("tra_live_00000000_aaaa");
    const b = hashApiKey("tra_live_00000000_aaab");
    expect(a).not.toBe(b);
  });
});

describe("looksLikeApiKey", () => {
  it("rejects input that isn't a key", () => {
    for (const bad of ["", "hello", "Bearer tra_live_x", "tra_live_zzzzzzzz_secret", "tra_prod_00000000_secretsecretsecret"]) {
      expect(looksLikeApiKey(bad), bad).toBe(false);
    }
  });

  it("rejects a key whose secret segment is too short to be random", () => {
    expect(looksLikeApiKey("tra_live_0123abcd_short")).toBe(false);
  });
});

describe("digestsMatch", () => {
  it("matches identical digests and rejects different ones", () => {
    const a = hashApiKey("one");
    const b = hashApiKey("two");
    expect(digestsMatch(a, a)).toBe(true);
    expect(digestsMatch(a, b)).toBe(false);
  });

  it("rejects empty or malformed input rather than treating it as equal", () => {
    expect(digestsMatch("", "")).toBe(false);
    expect(digestsMatch("abc", hashApiKey("abc"))).toBe(false);
  });
});

describe("bearerFrom", () => {
  it("extracts a bearer token case-insensitively", () => {
    expect(bearerFrom("Bearer abc123")).toBe("abc123");
    expect(bearerFrom("bearer abc123")).toBe("abc123");
  });

  it("refuses any other scheme", () => {
    expect(bearerFrom("Basic abc123")).toBeNull();
    expect(bearerFrom("abc123")).toBeNull();
    expect(bearerFrom(null)).toBeNull();
  });
});
