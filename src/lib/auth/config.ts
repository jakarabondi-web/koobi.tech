import type { NextAuthConfig } from "next-auth";

import type { GlobalRole } from "@/lib/permissions/roles";
import { surfaceForRoles } from "@/lib/permissions/roles";

/**
 * Edge-safe base config: no providers, no Prisma/bcrypt imports.
 * Used directly by middleware (edge runtime) and extended with the
 * Node-only Credentials provider in `./index.ts` for the API route
 * and server components.
 */
export const authConfig: NextAuthConfig = {
  trustHost: true,
  session: { strategy: "jwt", maxAge: 60 * 60 * 8 },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.userId = user.id;
        token.roles = (user as { roles?: GlobalRole[] }).roles ?? [];
        token.sessionVersion = (user as { sessionVersion?: number }).sessionVersion ?? 0;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.userId as string;
        session.user.roles = (token.roles as GlobalRole[]) ?? [];
        session.user.surface = surfaceForRoles(session.user.roles);
      }
      return session;
    },
  },
};
