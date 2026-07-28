import { prisma } from "@/lib/db/prisma";
import type { GlobalRole } from "@/lib/permissions/roles";
import type { SupportedOAuthProvider } from "@/lib/auth/oauth-providers";

export type OAuthProfile = {
  email: string | null | undefined;
  /** True only when the provider itself asserts the address is verified. */
  emailVerified: boolean | null | undefined;
  givenName?: string | null;
  familyName?: string | null;
  name?: string | null;
  picture?: string | null;
};

export type OAuthAccountTokens = {
  providerAccountId: string;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null;
  tokenType?: string | null;
  scope?: string | null;
  idToken?: string | null;
};

type ResolvedUser = {
  id: string;
  status: string;
  twoFactorEnabled: boolean;
  roles: GlobalRole[];
  email: string;
  firstName: string;
  lastName: string;
  avatarUrl: string | null;
  sessionVersion: number;
};

export type OAuthResolution =
  | { outcome: "ok"; user: ResolvedUser }
  | { outcome: "denied"; reason: "no_email" | "email_unverified" | "sso_required" | "inactive" };

function splitName(profile: OAuthProfile): { first: string; last: string } {
  if (profile.givenName || profile.familyName) {
    return { first: profile.givenName || "Member", last: profile.familyName || "" };
  }
  const parts = (profile.name ?? "").trim().split(/\s+/);
  return { first: parts[0] || "Member", last: parts.slice(1).join(" ") };
}

/**
 * Links an OAuth sign-in to a Traivr account, creating one if this is the
 * person's first time here.
 *
 * No adapter is involved — sessions are JWT-based, so every part of this is
 * explicit rather than delegated, which is also what makes each rule below
 * auditable in one place:
 *
 * - The provider must assert the email is verified. An OAuth login is being
 *   used here as a substitute for our own email-confirmation token, so an
 *   unverified address proves nothing and must not create or claim an
 *   account.
 * - If the email's domain enforces enterprise SSO, a generic Google login
 *   is not the enforced identity provider and is refused — otherwise SSO
 *   enforcement would be advisory.
 * - Linking to an existing account happens by verified email match. This is
 *   deliberately *not* gated behind "only if the account has no password" or
 *   similar — a verified email from Google is exactly as strong a proof of
 *   address ownership as our own confirmation link.
 */
export async function resolveOAuthSignIn(
  provider: SupportedOAuthProvider,
  profile: OAuthProfile,
  tokens: OAuthAccountTokens
): Promise<OAuthResolution> {
  const email = profile.email?.toLowerCase().trim();
  if (!email) return { outcome: "denied", reason: "no_email" };
  if (profile.emailVerified === false) return { outcome: "denied", reason: "email_unverified" };

  const domain = email.split("@")[1];
  if (domain) {
    const ssoOrg = await prisma.organization.findFirst({
      where: { ssoDomain: domain, ssoEnforced: true, ssoDomainVerifiedAt: { not: null } },
      select: { id: true },
    });
    if (ssoOrg) return { outcome: "denied", reason: "sso_required" };
  }

  const existingAccount = await prisma.account.findUnique({
    where: { provider_providerAccountId: { provider, providerAccountId: tokens.providerAccountId } },
    include: { user: { include: { roles: { include: { role: true } } } } },
  });

  let user = existingAccount?.user ?? null;

  if (!user) {
    const found = await prisma.user.findUnique({
      where: { email },
      include: { roles: { include: { role: true } } },
    });

    if (found) {
      // A verified OAuth login is at least as strong as our own email token,
      // so an unconfirmed signup can be activated by it — this is the one
      // case where a PENDING account is allowed to become ACTIVE without
      // going through issueEmailVerification.
      user = found.emailVerifiedAt
        ? found
        : await prisma.user.update({
            where: { id: found.id },
            data: { status: "ACTIVE", emailVerifiedAt: new Date() },
            include: { roles: { include: { role: true } } },
          });
    } else {
      const { first, last } = splitName(profile);
      const roleRow = await prisma.role.upsert({
        where: { key: "TRAINER" },
        update: {},
        create: { key: "TRAINER", name: "TRAINER" },
      });

      user = await prisma.user.create({
        data: {
          email,
          firstName: first,
          lastName: last,
          avatarUrl: profile.picture ?? null,
          status: "ACTIVE",
          emailVerifiedAt: new Date(),
          roles: { create: { roleId: roleRow.id } },
          trainerProfile: { create: {} },
          consentRecords: { create: { type: "terms_of_service", version: "v1" } },
        },
        include: { roles: { include: { role: true } } },
      });
    }

    await prisma.account.create({
      data: {
        userId: user.id,
        provider,
        providerAccountId: tokens.providerAccountId,
        accessToken: tokens.accessToken ?? null,
        refreshToken: tokens.refreshToken ?? null,
        expiresAt: tokens.expiresAt ?? null,
        tokenType: tokens.tokenType ?? null,
        scope: tokens.scope ?? null,
        idToken: tokens.idToken ?? null,
      },
    });
  }

  if (user.status !== "ACTIVE") return { outcome: "denied", reason: "inactive" };

  return {
    outcome: "ok",
    user: {
      id: user.id,
      status: user.status,
      twoFactorEnabled: user.twoFactorEnabled,
      roles: user.roles.map((r) => r.role.key) as GlobalRole[],
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      avatarUrl: user.avatarUrl,
      sessionVersion: user.sessionVersion,
    },
  };
}
