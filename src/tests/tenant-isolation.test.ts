import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Tenant isolation is the boundary that stops one AI company seeing another's
 * projects and datasets. These tests pin the behaviour that matters: the
 * organization id is always derived from membership, never trusted from
 * caller input, and a cross-tenant id is indistinguishable from a missing one.
 */

const findFirstMember = vi.fn();
const findFirstProject = vi.fn();
const findFirstDataset = vi.fn();
const authMock = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    organizationMember: { findFirst: (...a: unknown[]) => findFirstMember(...a) },
    project: { findFirst: (...a: unknown[]) => findFirstProject(...a) },
    dataset: { findFirst: (...a: unknown[]) => findFirstDataset(...a) },
  },
}));

vi.mock("@/lib/auth", () => ({ auth: () => authMock() }));

const { requireTenant, requireProjectInTenant, requireDatasetInTenant, getTenant, TenantError } =
  await import("@/server/services/tenant");

const TENANT = {
  userId: "user-1",
  organizationId: "org-a",
  organizationName: "Meridian AI",
  memberRole: "ADMIN" as const,
  isOrgAdmin: true,
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("requireTenant", () => {
  it("resolves the organization from membership", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    findFirstMember.mockResolvedValue({
      organizationId: "org-a",
      role: "ADMIN",
      organization: { name: "Meridian AI" },
    });

    const tenant = await requireTenant();
    expect(tenant.organizationId).toBe("org-a");
    expect(tenant.isOrgAdmin).toBe(true);
  });

  it("only considers memberships that have been accepted", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    findFirstMember.mockResolvedValue(null);

    await expect(requireTenant()).rejects.toBeInstanceOf(TenantError);
    // An invited-but-not-joined member must not resolve to a tenant.
    expect(findFirstMember.mock.calls[0][0].where.joinedAt).toEqual({ not: null });
  });

  it("rejects an unauthenticated caller", async () => {
    authMock.mockResolvedValue(null);
    await expect(requireTenant()).rejects.toBeInstanceOf(TenantError);
  });

  it("treats a plain MEMBER as a non-admin", async () => {
    authMock.mockResolvedValue({ user: { id: "user-2" } });
    findFirstMember.mockResolvedValue({
      organizationId: "org-a",
      role: "MEMBER",
      organization: { name: "Meridian AI" },
    });

    expect((await requireTenant()).isOrgAdmin).toBe(false);
  });
});

describe("getTenant", () => {
  it("returns null rather than throwing when there is no membership", async () => {
    authMock.mockResolvedValue({ user: { id: "user-1" } });
    findFirstMember.mockResolvedValue(null);
    expect(await getTenant()).toBeNull();
  });
});

describe("requireProjectInTenant", () => {
  it("always constrains the lookup by the caller's organization", async () => {
    findFirstProject.mockResolvedValue({ id: "proj-1", organizationId: "org-a" });

    await requireProjectInTenant("proj-1", TENANT);

    expect(findFirstProject).toHaveBeenCalledWith({
      where: { id: "proj-1", organizationId: "org-a" },
    });
  });

  it("rejects a project belonging to another organization", async () => {
    // Scoped query returns nothing because the row belongs to org-b.
    findFirstProject.mockResolvedValue(null);
    await expect(requireProjectInTenant("proj-from-org-b", TENANT)).rejects.toBeInstanceOf(
      TenantError
    );
  });

  it("gives the same message for cross-tenant and missing ids, to avoid leaking existence", async () => {
    findFirstProject.mockResolvedValue(null);

    const crossTenant = await requireProjectInTenant("proj-from-org-b", TENANT).catch(
      (e: Error) => e.message
    );
    const missing = await requireProjectInTenant("does-not-exist", TENANT).catch(
      (e: Error) => e.message
    );

    expect(crossTenant).toBe(missing);
  });
});

describe("requireDatasetInTenant", () => {
  it("constrains the lookup by organization", async () => {
    findFirstDataset.mockResolvedValue({ id: "ds-1", organizationId: "org-a" });

    await requireDatasetInTenant("ds-1", TENANT);

    expect(findFirstDataset).toHaveBeenCalledWith({
      where: { id: "ds-1", organizationId: "org-a" },
    });
  });

  it("rejects a dataset from another organization", async () => {
    findFirstDataset.mockResolvedValue(null);
    await expect(requireDatasetInTenant("ds-from-org-b", TENANT)).rejects.toBeInstanceOf(
      TenantError
    );
  });
});
