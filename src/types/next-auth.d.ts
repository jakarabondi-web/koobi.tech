import type { DefaultSession } from "next-auth";
import type { GlobalRole, AppSurface } from "@/lib/permissions/roles";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
      roles: GlobalRole[];
      surface: AppSurface | null;
    } & DefaultSession["user"];
  }

  interface User {
    roles?: GlobalRole[];
    sessionVersion?: number;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    roles?: GlobalRole[];
    /** Compared against User.sessionVersion on every Node-runtime auth()
     * call — a mismatch means "sign out everywhere" was used since this
     * token was issued, and the session is treated as invalid. */
    sessionVersion?: number;
  }
}
