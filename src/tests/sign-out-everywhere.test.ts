import { describe, expect, it, vi, beforeEach } from "vitest";

const authMock = vi.fn();
const userFindUnique = vi.fn();
const userUpdate = vi.fn();
const auditLogCreate = vi.fn();
const bcryptCompare = vi.fn();
const redirectMock = vi.fn((path: string) => {
  throw new Error(`REDIRECT:${path}`);
});

vi.mock("@/lib/auth", () => ({ auth: (...a: unknown[]) => authMock(...a) }));
vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    user: {
      findUnique: (...a: unknown[]) => userFindUnique(...a),
      update: (...a: unknown[]) => userUpdate(...a),
    },
    auditLog: { create: (...a: unknown[]) => auditLogCreate(...a) },
  },
}));
vi.mock("bcryptjs", () => ({ default: { compare: (...a: unknown[]) => bcryptCompare(...a) } }));
vi.mock("next/navigation", () => ({ redirect: (...a: [string]) => redirectMock(...a) }));

const { signOutEverywhere } = await import("@/server/actions/sessions");

const USER = { id: "user-1", passwordHash: "hashed" };

function formData(password: string) {
  const fd = new FormData();
  fd.set("password", password);
  return fd;
}

beforeEach(() => {
  authMock.mockReset().mockResolvedValue({ user: { id: USER.id } });
  userFindUnique.mockReset();
  userUpdate.mockReset();
  auditLogCreate.mockReset();
  bcryptCompare.mockReset();
  redirectMock.mockClear();
});

describe("signOutEverywhere", () => {
  it("refuses an incorrect password without bumping sessionVersion", async () => {
    userFindUnique.mockResolvedValue(USER);
    bcryptCompare.mockResolvedValue(false);

    const result = await signOutEverywhere({ status: "idle" }, formData("wrong"));

    expect(result.status).toBe("error");
    expect(userUpdate).not.toHaveBeenCalled();
    expect(redirectMock).not.toHaveBeenCalled();
  });

  it("bumps sessionVersion and redirects to /login on success", async () => {
    userFindUnique.mockResolvedValue(USER);
    bcryptCompare.mockResolvedValue(true);
    userUpdate.mockResolvedValue({});

    await expect(signOutEverywhere({ status: "idle" }, formData("correct"))).rejects.toThrow("REDIRECT:/login");

    expect(userUpdate).toHaveBeenCalledWith({
      where: { id: USER.id },
      data: { sessionVersion: { increment: 1 } },
    });
  });
});
