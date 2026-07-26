import { timingSafeEqual } from "node:crypto";

import { NextResponse } from "next/server";

import { prisma } from "@/lib/db/prisma";

/**
 * POST /api/admin/seed — one-time demo-data seeding for a fresh deployment.
 *
 * This exists because a managed database often can't be reached from a
 * laptop, leaving a freshly deployed site with no way in. It creates a
 * **super admin with a password published in this repository**, so it is
 * deliberately hemmed in:
 *
 *   1. It does not exist unless `SEED_SECRET` is set. Without it the route
 *      404s exactly like a URL that was never defined — nothing to probe.
 *   2. The secret must match, compared in constant time.
 *   3. It refuses to run if the database already has a user. Seeding is a
 *      first-run action; re-running it against a live system is never what
 *      anyone wants, and this makes it impossible rather than discouraged.
 *
 * DELETE THIS ROUTE, and unset SEED_SECRET, once you have signed in.
 */

export const maxDuration = 60;

function secretMatches(provided: string, expected: string): boolean {
  const a = Buffer.from(provided);
  const b = Buffer.from(expected);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function bearer(header: string | null): string | null {
  if (!header) return null;
  const match = /^Bearer\s+(\S+)$/i.exec(header.trim());
  return match ? match[1] : null;
}

export async function POST(request: Request) {
  const expected = process.env.SEED_SECRET;

  // Not configured means not deployed, as far as any caller can tell.
  if (!expected || expected.length < 16) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  const provided = bearer(request.headers.get("authorization"));
  if (!provided || !secretMatches(provided, expected)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    return NextResponse.json(
      {
        error: "Database is not empty.",
        detail:
          `Found ${existingUsers} existing user(s). Seeding only runs on a fresh ` +
          "database, so it can't overwrite real accounts.",
      },
      { status: 409 }
    );
  }

  try {
    // Imported lazily so the seed module — and the demo password it contains
    // — is only ever loaded when this route is genuinely invoked.
    const { seedDatabase } = await import("../../../../../prisma/seed");
    await seedDatabase();
  } catch (err) {
    console.error("Seeding failed:", err);
    return NextResponse.json(
      { error: "Seeding failed.", detail: (err as Error).message },
      { status: 500 }
    );
  }

  return NextResponse.json({
    seeded: true,
    accounts: [
      "trainer@trainora.demo",
      "reviewer@trainora.demo",
      "client@trainora.demo",
      "admin@trainora.demo",
    ],
    password: "Trainora!Demo2026",
    warning:
      "These credentials are published in the repository. Change them now, " +
      "then remove SEED_SECRET and delete src/app/api/admin/seed/route.ts.",
  });
}
