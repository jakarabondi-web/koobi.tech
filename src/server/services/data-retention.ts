import { prisma } from "@/lib/db/prisma";

/**
 * Fixed, documented retention windows — not an admin-configurable settings
 * table. "Configurable" implies an operator can change this at runtime
 * without a code change and review; that doesn't exist here, and claiming
 * it would repeat the mistake this file exists to fix (see SECURITY.md's
 * "Data retention" section). Change a window by editing this constant and
 * shipping it, same as any other policy change.
 */
export const RETENTION_WINDOWS = {
  /** Coarse location + hashed-IP signals — fraud/lockout correlation only. */
  locationSignalDays: 90,
  /** Per-login IP/device history shown on account security pages. */
  loginEventDays: 90,
  /**
   * Audit log — approvals, payments, exports. Deliberately long: this is
   * the record that survives a dispute or compliance review, so it is never
   * swept on the same schedule as ordinary telemetry. See SECURITY.md.
   */
  auditLogDays: 365 * 7,
} as const;

function cutoff(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * Deletes rows past their documented retention window. Run daily via
 * /api/cron/data-retention (see vercel.json). Each category is independent
 * so a failure in one doesn't block the others.
 */
export async function runDataRetentionSweep() {
  const [locationSignals, loginEvents, auditLogs] = await Promise.all([
    prisma.locationSignal.deleteMany({ where: { observedAt: { lt: cutoff(RETENTION_WINDOWS.locationSignalDays) } } }),
    prisma.loginEvent.deleteMany({ where: { createdAt: { lt: cutoff(RETENTION_WINDOWS.loginEventDays) } } }),
    prisma.auditLog.deleteMany({ where: { createdAt: { lt: cutoff(RETENTION_WINDOWS.auditLogDays) } } }),
  ]);

  return {
    locationSignalsDeleted: locationSignals.count,
    loginEventsDeleted: loginEvents.count,
    auditLogsDeleted: auditLogs.count,
  };
}
