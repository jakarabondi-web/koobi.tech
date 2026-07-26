import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";
import { databaseUrlSource } from "@/lib/db/connection-url";
import { isEmailConfigured } from "@/lib/email/client";

/**
 * GET /api/health — what is actually deployed and whether it can reach data.
 *
 * Exists because "is my latest commit live?" is otherwise guesswork: a
 * platform's own 404 page looks identical whether a route is missing, the
 * build is stale, or the deployment was never promoted. Reporting the commit
 * turns that into a one-line answer.
 *
 * Everything here is either public (a commit SHA in the user's own repo) or a
 * boolean. No connection strings, no secrets, no counts that would leak
 * customer data.
 */
export async function GET() {
  let database: "connected" | "unreachable" | "not_configured" = "not_configured";
  let migrated = false;

  if (databaseUrlSource()) {
    try {
      // Cheapest possible round trip that proves both connectivity and that
      // the schema exists.
      await prisma.$queryRaw`SELECT 1`;
      database = "connected";
      await prisma.user.count();
      migrated = true;
    } catch {
      // A reachable database with no tables reports connected-but-unmigrated
      // rather than failing outright, because those need different fixes.
      if (database !== "connected") database = "unreachable";
    }
  }

  return NextResponse.json(
    {
      ok: database === "connected" && migrated,
      commit: process.env.VERCEL_GIT_COMMIT_SHA?.slice(0, 7) ?? "unknown",
      branch: process.env.VERCEL_GIT_COMMIT_REF ?? "unknown",
      environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV ?? "unknown",
      database,
      migrated,
      databaseUrlFrom: databaseUrlSource() ?? null,
      authSecretSet: Boolean(process.env.AUTH_SECRET),
      // Unset means sign-up shows the confirmation link on screen instead of
      // sending it — see SECURITY.md. Worth being able to check at a glance.
      emailConfigured: isEmailConfigured(),
      emailFrom: process.env.EMAIL_FROM ?? "onboarding@resend.dev (default)",
      seedEndpointEnabled: Boolean(
        process.env.SEED_SECRET && process.env.SEED_SECRET.length >= 16
      ),
    },
    { headers: { "Cache-Control": "no-store" } }
  );
}
