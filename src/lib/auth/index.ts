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
  ],
});
