import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import type { GlobalRole } from "@/lib/permissions/roles";

import { authConfig } from "./config";

const credentialsSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

/**
 * Auth.js only forwards a `code` to the client when it's declared as a class
 * property on a CredentialsSignin subclass — a code passed to the constructor
 * sets the message instead and is masked as the generic "credentials".
 */
class EmailUnverifiedError extends CredentialsSignin {
  code = "email_unverified";
}

class AccountInactiveError extends CredentialsSignin {
  code = "account_inactive";
}

/** The account's domain is bound to an organization that requires SSO. */
class SsoRequiredError extends CredentialsSignin {
  code = "sso_required";
}

const LOCKOUT_THRESHOLD = 5;
const LOCKOUT_MINUTES = 15;

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Email and password",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(raw) {
        const parsed = credentialsSchema.safeParse(raw);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await prisma.user.findUnique({
          where: { email: email.toLowerCase() },
          include: { roles: { include: { role: true } } },
        });
        if (!user || !user.passwordHash) return null;

        if (user.lockedUntil && user.lockedUntil > new Date()) {
          return null;
        }

        // If the account's email domain belongs to an organization that
        // enforces SSO, the password path is closed — otherwise enforcement
        // would be advisory, and a former employee whose IdP account was
        // deprovisioned could still sign in with a password they remember.
        // Checked before the password is compared: the answer doesn't depend
        // on it.
        const domain = user.email.split("@")[1]?.toLowerCase();
        if (domain) {
          const ssoOrg = await prisma.organization.findFirst({
            where: {
              ssoDomain: domain,
              ssoEnforced: true,
              ssoDomainVerifiedAt: { not: null },
            },
            select: { id: true },
          });
          if (ssoOrg) throw new SsoRequiredError();
        }

        const valid = await bcrypt.compare(password, user.passwordHash);
        if (!valid) {
          const failedCount = user.failedLoginCount + 1;
          await prisma.user.update({
            where: { id: user.id },
            data: {
              failedLoginCount: failedCount,
              lockedUntil:
                failedCount >= LOCKOUT_THRESHOLD
                  ? new Date(Date.now() + LOCKOUT_MINUTES * 60_000)
                  : null,
            },
          });
          return null;
        }

        // PENDING means the email address has never been confirmed;
        // SUSPENDED/DEACTIVATED are enforcement states. None may sign in.
        if (user.status !== "ACTIVE") {
          throw user.status === "PENDING" ? new EmailUnverifiedError() : new AccountInactiveError();
        }
        if (!user.emailVerifiedAt) {
          throw new EmailUnverifiedError();
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
        });

        const roles = user.roles.map((r) => r.role.key) as GlobalRole[];

        return {
          id: user.id,
          email: user.email,
          name: `${user.firstName} ${user.lastName}`,
          image: user.avatarUrl ?? undefined,
          roles,
        };
      },
    }),

    /**
     * Consumes the single-use ticket left by a completed OIDC callback.
     *
     * This provider trusts the ticket and nothing else: no password, no
     * email, no user id from the request. The ticket is deleted-on-use
     * inside a conditional update, so two tabs racing the same ticket can
     * only produce one session.
     */
    Credentials({
      id: "sso-ticket",
      name: "Single sign-on",
      credentials: { ticket: { label: "Ticket", type: "text" } },
      async authorize(raw) {
        const ticket = typeof raw?.ticket === "string" ? raw.ticket : null;
        if (!ticket) return null;

        const claimed = await prisma.ssoTicket.updateMany({
          where: { token: ticket, consumedAt: null, expiresAt: { gt: new Date() } },
          data: { consumedAt: new Date() },
        });
        if (claimed.count !== 1) return null;

        const row = await prisma.ssoTicket.findUnique({
          where: { token: ticket },
          include: { user: { include: { roles: { include: { role: true } } } } },
        });
        if (!row || row.user.status !== "ACTIVE") return null;

        await prisma.user.update({
          where: { id: row.userId },
          data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date() },
        });

        return {
          id: row.user.id,
          email: row.user.email,
          name: `${row.user.firstName} ${row.user.lastName}`,
          image: row.user.avatarUrl ?? undefined,
          roles: row.user.roles.map((r) => r.role.key) as GlobalRole[],
        };
      },
    }),
  ],
});
