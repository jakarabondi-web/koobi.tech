import { createHash, randomBytes } from "node:crypto";
import { resolveTxt } from "node:dns/promises";

import { createRemoteJWKSet, jwtVerify, type JWTPayload } from "jose";

/**
 * Enterprise SSO via OIDC.
 *
 * Two things here are deliberate and worth stating plainly:
 *
 * 1. **Domain ownership is proved, not asserted.** Binding an email domain to
 *    an organization decides who gets signed into which tenant, so a tenant
 *    that could simply type "gmail.com" would be able to capture other
 *    people's sign-ins. Verification is a real DNS TXT lookup.
 *
 * 2. **The client secret is never stored in the database.** It is read from
 *    the environment per organization. A secret in a row is a secret in every
 *    backup, every replica, and every support query.
 */

/** Domains that must never be claimed by a tenant. */
const PUBLIC_EMAIL_DOMAINS = new Set([
  "gmail.com", "googlemail.com", "outlook.com", "hotmail.com", "live.com",
  "yahoo.com", "ymail.com", "icloud.com", "me.com", "aol.com", "proton.me",
  "protonmail.com", "gmx.com", "mail.com", "zoho.com", "yandex.com",
  "qq.com", "163.com", "126.com", "fastmail.com", "hey.com", "tutanota.com",
]);

export const DNS_RECORD_PREFIX = "traivr-domain-verification=";

export function isPublicEmailDomain(domain: string): boolean {
  return PUBLIC_EMAIL_DOMAINS.has(domain.toLowerCase().trim());
}

/** Normalises user input like "https://Acme.com/" or "@acme.com" to "acme.com". */
export function normalizeDomain(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^@/, "")
    .replace(/\/.*$/, "")
    .replace(/\.$/, "");
}

export function isValidDomain(domain: string): boolean {
  // At least one dot, no spaces, labels of 1-63 chars, valid TLD shape.
  return /^(?=.{4,253}$)([a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,}$/.test(domain);
}

export function domainOfEmail(email: string): string | null {
  const at = email.lastIndexOf("@");
  if (at === -1 || at === email.length - 1) return null;
  return email.slice(at + 1).toLowerCase().trim();
}

export function generateDomainToken(): string {
  return randomBytes(16).toString("hex");
}

export type DomainCheck =
  | { verified: true }
  | { verified: false; reason: string; found: string[] };

/**
 * Looks for the expected TXT record on the domain.
 *
 * A missing record and a wrong record are reported differently here because
 * this is the tenant's own domain — there is nothing to leak, and "we found
 * these records instead" is the difference between a two-minute fix and a
 * support ticket.
 */
export async function checkDomainToken(
  domain: string,
  token: string,
  /** Injectable so the matching logic can be tested without live DNS. */
  resolver: (name: string) => Promise<string[][]> = resolveTxt
): Promise<DomainCheck> {
  const expected = `${DNS_RECORD_PREFIX}${token}`;

  let records: string[][];
  try {
    records = await resolver(domain);
  } catch (err) {
    const code = (err as { code?: string }).code;
    if (code === "ENOTFOUND" || code === "ENODATA") {
      return { verified: false, reason: "No TXT records found on this domain yet. DNS changes can take a few minutes to propagate.", found: [] };
    }
    return { verified: false, reason: "The DNS lookup failed. Try again in a moment.", found: [] };
  }

  // A TXT record can be split into several strings; DNS joins them.
  const flat = records.map((chunks) => chunks.join(""));
  const ours = flat.filter((r) => r.startsWith(DNS_RECORD_PREFIX));

  if (flat.includes(expected)) return { verified: true };

  return {
    verified: false,
    reason: ours.length
      ? "A Traivr verification record exists but its value doesn't match. Replace it with the value shown below."
      : "The verification record wasn't found. Add it to your DNS and try again.",
    found: ours,
  };
}

export type OidcDiscovery = {
  authorization_endpoint: string;
  token_endpoint: string;
  userinfo_endpoint?: string;
  jwks_uri?: string;
  issuer: string;
};

/**
 * Fetches an issuer's OIDC discovery document.
 *
 * The URL is validated as https before it is fetched: an issuer URL is
 * tenant-supplied, and fetching arbitrary schemes or internal addresses from
 * the server is how SSRF starts.
 */
export async function discoverOidc(issuerUrl: string): Promise<OidcDiscovery | { error: string }> {
  let url: URL;
  try {
    url = new URL(issuerUrl);
  } catch {
    return { error: "Enter a valid issuer URL." };
  }

  if (url.protocol !== "https:") {
    return { error: "The issuer URL must use https." };
  }

  const wellKnown = new URL(
    `${url.pathname.replace(/\/$/, "")}/.well-known/openid-configuration`,
    url.origin
  );

  try {
    const res = await fetch(wellKnown, {
      headers: { accept: "application/json" },
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) return { error: `The issuer returned ${res.status} for its discovery document.` };

    const body = (await res.json()) as Partial<OidcDiscovery>;
    if (!body.authorization_endpoint || !body.token_endpoint || !body.issuer) {
      return { error: "The discovery document is missing required endpoints." };
    }

    return {
      authorization_endpoint: body.authorization_endpoint,
      token_endpoint: body.token_endpoint,
      userinfo_endpoint: body.userinfo_endpoint,
      jwks_uri: body.jwks_uri,
      issuer: body.issuer,
    };
  } catch {
    return { error: "Couldn't reach the issuer's discovery endpoint." };
  }
}

/**
 * Per-organization client secret, read from the environment.
 *
 * Returns null when unset, and every caller must treat that as "SSO is
 * configured but not finished" — never as a reason to fall back to something
 * weaker.
 */
export function clientSecretFor(orgSlug: string): string | null {
  const key = `SSO_CLIENT_SECRET_${orgSlug.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  return process.env[key] || null;
}

/** PKCE verifier/challenge pair (S256). */
export function createPkcePair() {
  const verifier = randomBytes(32).toString("base64url");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  return { verifier, challenge };
}

export function createState(): string {
  return randomBytes(16).toString("base64url");
}

export function createNonce(): string {
  return randomBytes(16).toString("base64url");
}

/**
 * JWKS caching.
 *
 * `createRemoteJWKSet` caches keys and re-fetches on an unknown `kid`, which
 * is what handles an IdP rotating its signing key. Keeping one instance per
 * JWKS URL preserves that cache; building a new one per sign-in would refetch
 * the key set every time and turn the IdP into a hard dependency of every
 * request.
 */
const jwksCache = new Map<string, ReturnType<typeof createRemoteJWKSet>>();

function jwksFor(uri: string) {
  let set = jwksCache.get(uri);
  if (!set) {
    set = createRemoteJWKSet(new URL(uri), { timeoutDuration: 8000 });
    jwksCache.set(uri, set);
  }
  return set;
}

export type VerifiedIdToken = { email: string; emailVerified: boolean | null; subject: string };

/**
 * Verifies an id_token's signature and claims.
 *
 * The whole security of the SSO flow rests here. Without signature
 * verification an id_token is just a base64 string the browser handed us —
 * anyone able to reach the callback could mint claims for any address. The
 * checks below are the ones that make the token mean something:
 *
 *   - signature against the issuer's published JWKS
 *   - `iss` matches the issuer we discovered, so a token minted by a
 *     different provider is not accepted
 *   - `aud` matches our client id, so a token issued for another relying
 *     party of the same IdP can't be replayed at us
 *   - `nonce` matches the one we generated for this attempt, which is what
 *     stops a previously captured token being replayed
 *   - `exp`/`iat` via jose's default clock handling
 */
export async function verifyIdToken(params: {
  idToken: string;
  jwksUri: string;
  issuer: string;
  clientId: string;
  nonce: string;
}): Promise<VerifiedIdToken | { error: string }> {
  let payload: JWTPayload;
  try {
    ({ payload } = await jwtVerify(params.idToken, jwksFor(params.jwksUri), {
      issuer: params.issuer,
      audience: params.clientId,
      clockTolerance: 60,
    }));
  } catch (err) {
    return { error: `id_token verification failed: ${(err as Error).message}` };
  }

  if (payload.nonce !== params.nonce) {
    return { error: "id_token nonce did not match this sign-in attempt." };
  }

  const email = typeof payload.email === "string" ? payload.email : null;
  if (!email) return { error: "id_token contained no email claim." };
  if (typeof payload.sub !== "string") return { error: "id_token contained no subject." };

  return {
    email,
    emailVerified: typeof payload.email_verified === "boolean" ? payload.email_verified : null,
    subject: payload.sub,
  };
}
