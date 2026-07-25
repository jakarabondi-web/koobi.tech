import NextAuth from "next-auth";
import { NextResponse } from "next/server";

import { authConfig } from "@/lib/auth/config";
import { canAccessSurface, type AppSurface } from "@/lib/permissions/roles";

const { auth } = NextAuth(authConfig);

const SURFACE_BY_PREFIX: Array<[string, AppSurface]> = [
  ["/trainer", "trainer"],
  ["/client", "client"],
  ["/admin", "admin"],
];

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const match = SURFACE_BY_PREFIX.find(([prefix]) => pathname.startsWith(prefix));
  if (!match) return NextResponse.next();

  const [, surface] = match;
  const session = req.auth;

  if (!session?.user) {
    const loginUrl = new URL("/login", req.nextUrl.origin);
    loginUrl.searchParams.set("callbackUrl", pathname);
    loginUrl.searchParams.set("for", surface);
    return NextResponse.redirect(loginUrl);
  }

  if (!canAccessSurface(session.user.roles, surface)) {
    return NextResponse.redirect(new URL("/403", req.nextUrl.origin));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/trainer/:path*", "/client/:path*", "/admin/:path*"],
};
