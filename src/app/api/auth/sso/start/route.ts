import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import {
  clientSecretFor,
  createPkcePair,
  createState,
  discoverOidc,
  domainOfEmail,
} from "@/lib/auth/sso";

/**
 * GET /api/auth/sso/start?email=… — begins the OIDC authorization code flow.
 *
 * Authorization code + PKCE, with `state` bound to a short-lived HttpOnly
 * cookie. The email only selects which organization's IdP to send the user
 * to; it is never trusted as proof of who they are — that comes back from
 * the provider's token.
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const email = url.searchParams.get("email") ?? "";
  const domain = domainOfEmail(email);

  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/login?error=${reason}`, url.origin));

  if (!domain) return fail("sso_unknown_domain");

  const org = await prisma.organization.findFirst({
    where: { ssoDomain: domain, ssoDomainVerifiedAt: { not: null } },
    select: { id: true, slug: true, ssoIssuerUrl: true, ssoClientId: true },
  });

  if (!org?.ssoIssuerUrl || !org.ssoClientId) return fail("sso_unknown_domain");

  // The secret lives in the environment, never in the database. Without it
  // the flow cannot complete, and we say so rather than half-starting it.
  const secret = clientSecretFor(org.slug);
  if (!secret) return fail("sso_not_configured");

  const discovery = await discoverOidc(org.ssoIssuerUrl);
  if ("error" in discovery) return fail("sso_provider_unreachable");

  const { verifier, challenge } = createPkcePair();
  const state = createState();

  const authorize = new URL(discovery.authorization_endpoint);
  authorize.searchParams.set("response_type", "code");
  authorize.searchParams.set("client_id", org.ssoClientId);
  authorize.searchParams.set("redirect_uri", `${url.origin}/api/auth/sso/callback`);
  authorize.searchParams.set("scope", "openid email profile");
  authorize.searchParams.set("state", state);
  authorize.searchParams.set("code_challenge", challenge);
  authorize.searchParams.set("code_challenge_method", "S256");
  // Hints the IdP toward the right account without asserting it.
  authorize.searchParams.set("login_hint", email);

  const jar = await cookies();
  const common = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/api/auth/sso",
    maxAge: 600,
  };
  jar.set("sso_state", state, common);
  jar.set("sso_verifier", verifier, common);
  jar.set("sso_org", org.id, common);

  return NextResponse.redirect(authorize);
}
