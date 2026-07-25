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
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    userId?: string;
    roles?: GlobalRole[];
  }
}
