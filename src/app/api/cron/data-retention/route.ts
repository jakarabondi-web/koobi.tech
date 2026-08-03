import { NextResponse } from "next/server";

import { runDataRetentionSweep } from "@/server/services/data-retention";

/**
 * GET /api/cron/data-retention — scheduled sweep (see vercel.json "crons")
 * that enforces the fixed windows in src/server/services/data-retention.ts.
 * Location/login signals age out after 90 days; the audit log — the record
 * that survives a dispute — is kept far longer and is not touched by the
 * same schedule other telemetry is.
 *
 * Same bearer-token pattern as /api/cron/support-signals: Vercel signs its
 * own Cron Job requests with `Authorization: Bearer $CRON_SECRET`, and this
 * rejects anything else so the endpoint can't be used to force an
 * off-schedule deletion.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return NextResponse.json({ error: "CRON_SECRET is not configured." }, { status: 503 });
  }

  const auth = request.headers.get("authorization");
  if (auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  const result = await runDataRetentionSweep();
  return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}
