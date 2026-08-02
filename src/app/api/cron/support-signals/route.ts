import { NextResponse } from "next/server";

import { runSupportSignalScan } from "@/server/services/support-signals";

/**
 * GET /api/cron/support-signals — scheduled scan (see vercel.json "crons")
 * that turns three passive signals — a stalled application, a sharp quality
 * drop, a run of failed payouts — into a support ticket, instead of leaving
 * "needs help" entirely up to a trainer noticing and reporting it
 * themselves. Idempotent: reruns skip trainers already flagged for the same
 * signal (see flagForSupport in the service).
 *
 * Vercel signs its own Cron Job requests with `Authorization: Bearer
 * $CRON_SECRET` when that env var is set — this rejects anything else,
 * since without it the endpoint would let anyone spam open tickets.
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

  const result = await runSupportSignalScan();
  return NextResponse.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}
