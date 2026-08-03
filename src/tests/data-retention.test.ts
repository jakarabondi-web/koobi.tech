import { describe, expect, it, vi, beforeEach } from "vitest";

const locationSignalDeleteMany = vi.fn();
const loginEventDeleteMany = vi.fn();
const auditLogDeleteMany = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    locationSignal: { deleteMany: (...a: unknown[]) => locationSignalDeleteMany(...a) },
    loginEvent: { deleteMany: (...a: unknown[]) => loginEventDeleteMany(...a) },
    auditLog: { deleteMany: (...a: unknown[]) => auditLogDeleteMany(...a) },
  },
}));

const { runDataRetentionSweep, RETENTION_WINDOWS } = await import("@/server/services/data-retention");

beforeEach(() => {
  locationSignalDeleteMany.mockReset().mockResolvedValue({ count: 3 });
  loginEventDeleteMany.mockReset().mockResolvedValue({ count: 5 });
  auditLogDeleteMany.mockReset().mockResolvedValue({ count: 0 });
});

describe("runDataRetentionSweep", () => {
  it("deletes location signals, login events, and audit logs past their own windows", async () => {
    const result = await runDataRetentionSweep();

    expect(result).toEqual({ locationSignalsDeleted: 3, loginEventsDeleted: 5, auditLogsDeleted: 0 });
    expect(locationSignalDeleteMany).toHaveBeenCalledTimes(1);
    expect(loginEventDeleteMany).toHaveBeenCalledTimes(1);
    expect(auditLogDeleteMany).toHaveBeenCalledTimes(1);
  });

  it("keeps the audit log window far longer than telemetry — 7 years, not 90 days", () => {
    expect(RETENTION_WINDOWS.auditLogDays).toBe(365 * 7);
    expect(RETENTION_WINDOWS.auditLogDays).toBeGreaterThan(RETENTION_WINDOWS.loginEventDays);
  });

  it("passes an independent cutoff to each deleteMany call, roughly matching each window", async () => {
    await runDataRetentionSweep();

    const locationCutoff = (locationSignalDeleteMany.mock.calls[0]?.[0] as {
      where: { observedAt: { lt: Date } };
    }).where.observedAt.lt;
    const loginCutoff = (loginEventDeleteMany.mock.calls[0]?.[0] as {
      where: { createdAt: { lt: Date } };
    }).where.createdAt.lt;
    const auditCutoff = (auditLogDeleteMany.mock.calls[0]?.[0] as {
      where: { createdAt: { lt: Date } };
    }).where.createdAt.lt;

    const daysBetween = (a: Date, b: Date) => Math.round((a.getTime() - b.getTime()) / (24 * 60 * 60 * 1000));

    expect(daysBetween(new Date(), locationCutoff)).toBeGreaterThanOrEqual(89);
    expect(daysBetween(new Date(), locationCutoff)).toBeLessThanOrEqual(91);
    expect(daysBetween(new Date(), loginCutoff)).toBeGreaterThanOrEqual(89);
    expect(daysBetween(new Date(), loginCutoff)).toBeLessThanOrEqual(91);
    // Audit log cutoff should be ~7 years back, far earlier than the 90-day ones.
    expect(auditCutoff.getTime()).toBeLessThan(locationCutoff.getTime());
  });
});
