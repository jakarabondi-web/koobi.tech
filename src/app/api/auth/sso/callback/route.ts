import { randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { clientSecretFor, discoverOidc, domainOfEmail, verifyIdToken } from "@/lib/auth/sso";

/**
 * GET /api/auth/sso/callback — exchanges the authorization code.
 *
 * The identity that matters is the one in the provider's token response, not
 * anything carried through the browser. Two checks are load-bearing:
 *
 *   - `state` must match the cookie set at the start of the flow (CSRF).
 *   - the email the IdP returns must sit under the organization's *verified*
 *     domain, so a misconfigured or hostile IdP cannot assert an address
 *     belonging to someone else's tenant.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const jar = await cookies();

  const clear = (res: NextResponse) => {
    for (const name of ["sso_state", "sso_verifier", "sso_nonce", "sso_org"]) {
      res.cookies.set(name, "", { path: "/api/auth/sso", maxAge: 0 });
    }
    return res;
  };

  const fail = (reason: string) =>
    clear(NextResponse.redirect(new URL(`/login?error=${reason}`, url.origin)));

  const providerError = url.searchParams.get("error");
  if (providerError) return fail("sso_denied");

  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const expectedState = jar.get("sso_state")?.value;
  const verifier = jar.get("sso_verifier")?.value;
  const nonce = jar.get("sso_nonce")?.value;
  const orgId = jar.get("sso_org")?.value;

  if (!code || !state || !expectedState || !verifier || !nonce || !orgId) {
    return fail("sso_expired");
  }
  if (state !== expectedState) return fail("sso_state_mismatch");

  const org = await prisma.organization.findUnique({
    where: { id: orgId },
    select: { id: true, slug: true, ssoIssuerUrl: true, ssoClientId: true, ssoDomain: true, ssoDomainVerifiedAt: true },
  });
  if (!org?.ssoIssuerUrl || !org.ssoClientId || !org.ssoDomain || !org.ssoDomainVerifiedAt) {
    return fail("sso_not_configured");
  }

  const secret = clientSecretFor(org.slug);
  if (!secret) return fail("sso_not_configured");

  const discovery = await discoverOidc(org.ssoIssuerUrl);
  if ("error" in discovery) return fail("sso_provider_unreachable");

  let tokenBody: { id_token?: string; access_token?: string };
  try {
    const res = await fetch(discovery.token_endpoint, {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded", accept: "application/json" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        redirect_uri: `${url.origin}/api/auth/sso/callback`,
        client_id: org.ssoClientId,
        client_secret: secret,
        code_verifier: verifier,
      }),
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return fail("sso_token_exchange_failed");
    tokenBody = await res.json();
  } catch {
    return fail("sso_token_exchange_failed");
  }

  // An id_token is mandatory. Falling back to the userinfo endpoint when one
  // is missing would mean accepting an identity we never verified a signature
  // for, so an IdP that doesn't return one is a configuration error, not a
  // case to work around.
  if (!tokenBody.id_token) return fail("sso_no_id_token");
  if (!discovery.jwks_uri) return fail("sso_no_jwks");

  const verified = await verifyIdToken({
    idToken: tokenBody.id_token,
    jwksUri: discovery.jwks_uri,
    issuer: discovery.issuer,
    clientId: org.ssoClientId,
    nonce,
  });
  if ("error" in verified) return fail("sso_token_invalid");

  // An IdP that explicitly says an address is unverified must not be used to
  // sign someone in — that claim is how account-takeover-by-unverified-email
  // works. A provider that omits the claim entirely is trusted for its own
  // domain, which the check below still enforces.
  if (verified.emailVerified === false) return fail("sso_email_unverified");

  // The IdP is authoritative for its own domain and nothing else.
  if (domainOfEmail(verified.email) !== org.ssoDomain) return fail("sso_domain_mismatch");

  const email = verified.email;

  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
    select: { id: true, status: true },
  });

  // Just-in-time provisioning is not implemented: an account has to exist and
  // be invited to the organization first. Creating users straight from an IdP
  // assertion would let anyone in the tenant's directory into the product.
  if (!user) return fail("sso_no_account");
  if (user.status !== "ACTIVE") return fail("account_inactive");

  await prisma.auditLog.create({
    data: {
      actorId: user.id,
      organizationId: org.id,
      action: "sso.sign_in",
      entityType: "User",
      entityId: user.id,
      metadata: { issuer: discovery.issuer },
    },
  });

  // A route handler can't mint an Auth.js session, so the verified identity
  // is handed to the sign-in provider as a single-use ticket rather than as
  // a user id in a URL that anyone could edit.
  const ticket = randomBytes(32).toString("base64url");
  await prisma.ssoTicket.create({
    data: {
      token: ticket,
      userId: user.id,
      organizationId: org.id,
      issuer: discovery.issuer,
      expiresAt: new Date(Date.now() + 60_000),
    },
  });

  return clear(
    NextResponse.redirect(
      new URL(`/login/sso?ticket=${encodeURIComponent(ticket)}`, url.origin)
    )
  );
}
