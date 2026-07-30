import { NextResponse } from "next/server";

import { prisma, seedDatabase } from "../../../../../prisma/seed";

/**
 * TEMPORARY one-shot endpoint to seed the production database with demo
 * accounts. Token-gated because it has no session auth of its own. Delete
 * this route once the production database has been seeded — it should not
 * stay in the codebase.
 */
const SEED_TOKEN = "758c225086796e7b82f1decdcdd16b54599b1e65838e6b38";

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("token") !== SEED_TOKEN) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  try {
    await seedDatabase();
    return NextResponse.json({ ok: true });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : String(err) },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}
