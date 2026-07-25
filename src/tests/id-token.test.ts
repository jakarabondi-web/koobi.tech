import { describe, expect, it, beforeAll } from "vitest";
import { SignJWT, exportJWK, generateKeyPair, type JWK } from "jose";

import { verifyIdToken } from "@/lib/auth/sso";

/**
 * These sign real tokens with a real key and serve a real JWKS over a stubbed
 * fetch, because the point of the check is the cryptography — a test that
 * mocked the verification would prove nothing.
 */

const ISSUER = "https://idp.test";
const CLIENT_ID = "client-abc";
const NONCE = "nonce-123";
const JWKS_URI = "https://idp.test/jwks";

let privateKey: CryptoKey;
let publicJwk: JWK;
let otherPrivateKey: CryptoKey;

beforeAll(async () => {
  const pair = await generateKeyPair("RS256", { extractable: true });
  privateKey = pair.privateKey;
  publicJwk = { ...(await exportJWK(pair.publicKey)), alg: "RS256", kid: "test-key" };

  // A second, unrelated key — a token signed with this must never verify.
  otherPrivateKey = (await generateKeyPair("RS256", { extractable: true })).privateKey;

  const originalFetch = globalThis.fetch;
  globalThis.fetch = (async (input: RequestInfo | URL, init?: RequestInit) => {
    if (String(input).startsWith(JWKS_URI)) {
      return new Response(JSON.stringify({ keys: [publicJwk] }), {
        status: 200,
        headers: { "content-type": "application/json" },
      });
    }
    return originalFetch(input, init);
  }) as typeof fetch;
});

async function token(overrides: Record<string, unknown> = {}, key?: CryptoKey) {
  const claims: Record<string, unknown> = {
    email: "person@acme.com",
    email_verified: true,
    nonce: NONCE,
    ...overrides,
  };

  let jwt = new SignJWT(claims)
    .setProtectedHeader({ alg: "RS256", kid: "test-key" })
    .setIssuedAt()
    .setExpirationTime("5m");

  if (!("iss" in claims)) jwt = jwt.setIssuer(ISSUER);
  if (!("aud" in claims)) jwt = jwt.setAudience(CLIENT_ID);
  if (!("sub" in claims)) jwt = jwt.setSubject("user-1");

  return jwt.sign(key ?? privateKey);
}

const verify = (idToken: string, nonce = NONCE) =>
  verifyIdToken({ idToken, jwksUri: JWKS_URI, issuer: ISSUER, clientId: CLIENT_ID, nonce });

describe("verifyIdToken", () => {
  it("accepts a correctly signed token", async () => {
    const result = await verify(await token());
    expect(result).toEqual({ email: "person@acme.com", emailVerified: true, subject: "user-1" });
  });

  it("rejects a token signed with the wrong key", async () => {
    // The whole flow rests on this: without it an id_token is just a base64
    // string the browser handed us.
    const result = await verify(await token({}, otherPrivateKey));
    expect(result).toHaveProperty("error");
  });

  it("rejects an unsigned 'alg: none' token", async () => {
    const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
    const payload = Buffer.from(
      JSON.stringify({ iss: ISSUER, aud: CLIENT_ID, sub: "x", email: "attacker@acme.com", nonce: NONCE })
    ).toString("base64url");
    const result = await verify(`${header}.${payload}.`);
    expect(result).toHaveProperty("error");
  });

  it("rejects a token from a different issuer", async () => {
    const result = await verify(await token({ iss: "https://evil.test" }));
    expect(result).toHaveProperty("error");
  });

  it("rejects a token issued for a different client", async () => {
    // Another relying party of the same IdP must not be able to replay its
    // token at us.
    const result = await verify(await token({ aud: "someone-elses-client" }));
    expect(result).toHaveProperty("error");
  });

  it("rejects a token whose nonce belongs to another attempt", async () => {
    const result = await verify(await token({ nonce: "a-different-nonce" }));
    expect(result).toHaveProperty("error");
    if ("error" in result) expect(result.error).toMatch(/nonce/i);
  });

  it("rejects a token with no nonce at all", async () => {
    const result = await verify(await token({ nonce: undefined }));
    expect(result).toHaveProperty("error");
  });

  it("rejects an expired token", async () => {
    const expired = await new SignJWT({ email: "person@acme.com", nonce: NONCE })
      .setProtectedHeader({ alg: "RS256", kid: "test-key" })
      .setIssuer(ISSUER)
      .setAudience(CLIENT_ID)
      .setSubject("user-1")
      .setIssuedAt(Math.floor(Date.now() / 1000) - 7200)
      .setExpirationTime(Math.floor(Date.now() / 1000) - 3600)
      .sign(privateKey);

    const result = await verify(expired);
    expect(result).toHaveProperty("error");
  });

  it("rejects a token with no email claim", async () => {
    const result = await verify(await token({ email: undefined }));
    expect(result).toHaveProperty("error");
  });

  it("reports email_verified: false rather than swallowing it", async () => {
    // The callback refuses the sign-in on this; it must survive the trip.
    const result = await verify(await token({ email_verified: false }));
    expect(result).toHaveProperty("emailVerified", false);
  });

  it("reports a missing email_verified claim as null, not false", async () => {
    // Plenty of IdPs omit it; treating absent as unverified would lock out
    // legitimate providers.
    const result = await verify(await token({ email_verified: undefined }));
    expect(result).toHaveProperty("emailVerified", null);
  });

  it("rejects a garbage token without throwing", async () => {
    const result = await verify("not-a-jwt");
    expect(result).toHaveProperty("error");
  });
});
