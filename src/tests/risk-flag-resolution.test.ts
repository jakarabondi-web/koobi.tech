import { describe, expect, it, vi, beforeEach } from "vitest";

const riskFlagFindUnique = vi.fn();
const riskFlagUpdate = vi.fn();
const auditLogCreate = vi.fn();
const transaction = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    riskFlag: {
      findUnique: (...a: unknown[]) => riskFlagFindUnique(...a),
      update: (...a: unknown[]) => riskFlagUpdate(...a),
    },
    auditLog: { create: (...a: unknown[]) => auditLogCreate(...a) },
    $transaction: (...a: unknown[]) => transaction(...a),
  },
}));

const { resolveRiskFlag, RiskFlagError } = await import("@/server/services/fraud");

const FLAG = { id: "flag-1", userId: "user-1", signal: "duplicate_identity_match", status: "OPEN", details: null };

beforeEach(() => {
  riskFlagFindUnique.mockReset().mockResolvedValue(FLAG);
  riskFlagUpdate.mockReset().mockResolvedValue({ ...FLAG, status: "DISMISSED" });
  auditLogCreate.mockReset().mockResolvedValue({});
  transaction.mockReset().mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({ riskFlag: { update: riskFlagUpdate }, auditLog: { create: auditLogCreate } })
  );
});

describe("resolveRiskFlag", () => {
  it("refuses a flag that no longer exists", async () => {
    riskFlagFindUnique.mockResolvedValue(null);

    await expect(
      resolveRiskFlag({ flagId: "missing", actorId: "qm-1", outcome: "DISMISSED", notes: "n/a" })
    ).rejects.toThrow(RiskFlagError);
  });

  it("refuses a flag that isn't OPEN anymore", async () => {
    riskFlagFindUnique.mockResolvedValue({ ...FLAG, status: "REVIEWED" });

    await expect(
      resolveRiskFlag({ flagId: "flag-1", actorId: "qm-1", outcome: "DISMISSED", notes: "n/a" })
    ).rejects.toThrow(/already been resolved/i);
    expect(riskFlagUpdate).not.toHaveBeenCalled();
  });

  it("resolves an open flag and records the outcome", async () => {
    await resolveRiskFlag({ flagId: "flag-1", actorId: "qm-1", outcome: "ACTION_TAKEN", notes: "Suspended account." });

    expect(riskFlagUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "flag-1" },
        data: expect.objectContaining({ status: "ACTION_TAKEN" }),
      })
    );
    expect(auditLogCreate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ action: "risk_flag.action_taken" }) })
    );
  });
});
