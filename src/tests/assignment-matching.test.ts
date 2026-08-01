import { describe, expect, it, vi, beforeEach } from "vitest";

const projectApplicationFindUnique = vi.fn();
const projectApplicationUpdate = vi.fn();
const projectAssignmentUpsert = vi.fn();
const auditLogCreate = vi.fn();
const notificationCreate = vi.fn();
const transaction = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    projectApplication: {
      findUnique: (...a: unknown[]) => projectApplicationFindUnique(...a),
      update: (...a: unknown[]) => projectApplicationUpdate(...a),
    },
    projectAssignment: { upsert: (...a: unknown[]) => projectAssignmentUpsert(...a) },
    auditLog: { create: (...a: unknown[]) => auditLogCreate(...a) },
    notification: { create: (...a: unknown[]) => notificationCreate(...a) },
    $transaction: (...a: unknown[]) => transaction(...a),
  },
}));

const { matchApplication, rejectApplication, AssignmentError } = await import("@/server/services/assignment");

const APPLICATION = { id: "app-1", projectId: "proj-1", userId: "user-1", status: "APPLIED" };

beforeEach(() => {
  projectApplicationFindUnique.mockReset().mockResolvedValue(APPLICATION);
  projectApplicationUpdate.mockReset().mockResolvedValue({ ...APPLICATION, status: "MATCHED" });
  projectAssignmentUpsert.mockReset().mockResolvedValue({});
  auditLogCreate.mockReset().mockResolvedValue({});
  notificationCreate.mockReset().mockResolvedValue({});
  transaction.mockReset().mockImplementation(async (cb: (tx: unknown) => unknown) =>
    cb({
      projectApplication: { update: projectApplicationUpdate },
      projectAssignment: { upsert: projectAssignmentUpsert },
      auditLog: { create: auditLogCreate },
      notification: { create: notificationCreate },
    })
  );
});

describe("matchApplication", () => {
  it("refuses an application that no longer exists", async () => {
    projectApplicationFindUnique.mockResolvedValue(null);

    await expect(
      matchApplication({ applicationId: "missing", decidedBy: "ops-1" })
    ).rejects.toThrow(AssignmentError);
    expect(projectAssignmentUpsert).not.toHaveBeenCalled();
  });

  it("refuses an application that has already been decided", async () => {
    projectApplicationFindUnique.mockResolvedValue({ ...APPLICATION, status: "MATCHED" });

    await expect(
      matchApplication({ applicationId: "app-1", decidedBy: "ops-1" })
    ).rejects.toThrow(/already been decided/i);
    expect(projectAssignmentUpsert).not.toHaveBeenCalled();
  });

  it("activates an assignment and marks the application matched", async () => {
    await matchApplication({ applicationId: "app-1", decidedBy: "ops-1" });

    expect(projectAssignmentUpsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { projectId_userId: { projectId: "proj-1", userId: "user-1" } },
        create: expect.objectContaining({ status: "ACTIVE" }),
        update: expect.objectContaining({ status: "ACTIVE" }),
      })
    );
    expect(projectApplicationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "MATCHED" }) })
    );
  });
});

describe("rejectApplication", () => {
  it("refuses an application that has already been decided", async () => {
    projectApplicationFindUnique.mockResolvedValue({ ...APPLICATION, status: "REJECTED" });

    await expect(
      rejectApplication({ applicationId: "app-1", decidedBy: "ops-1" })
    ).rejects.toThrow(/already been decided/i);
  });

  it("declines without touching assignments", async () => {
    await rejectApplication({ applicationId: "app-1", decidedBy: "ops-1", reason: "Not a fit." });

    expect(projectAssignmentUpsert).not.toHaveBeenCalled();
    expect(projectApplicationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ status: "REJECTED" }) })
    );
  });
});
