import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";

/**
 * Tenant resolution for the client portal.
 *
 * SECURITY: every client-portal query must scope through this module. Holding
 * the CLIENT_ADMIN role proves *a* user is a client admin — it does not prove
 * they belong to the organization whose data is being requested. An
 * organization id arriving from a URL, form, or API payload is untrusted
 * until checked against OrganizationMember here.
 */

export class TenantError extends Error {}

export type TenantContext = {
  userId: string;
  organizationId: string;
  organizationName: string;
  /** Membership role within the org — distinct from the global RBAC role. */
  memberRole: "MEMBER" | "ADMIN" | "BILLING_OWNER";
  isOrgAdmin: boolean;
};

/**
 * Resolves the signed-in user's organization.
 * Throws if they aren't signed in or aren't a member of any organization.
 */
export async function requireTenant(): Promise<TenantContext> {
  const session = await auth();
  if (!session?.user) throw new TenantError("Not signed in.");

  const membership = await prisma.organizationMember.findFirst({
    where: { userId: session.user.id, joinedAt: { not: null } },
    include: { organization: true },
    orderBy: { joinedAt: "asc" },
  });

  if (!membership) {
    throw new TenantError("Your account isn't linked to an organization yet.");
  }

  return {
    userId: session.user.id,
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    memberRole: membership.role,
    isOrgAdmin: membership.role === "ADMIN" || membership.role === "BILLING_OWNER",
  };
}

/** Same as requireTenant but returns null instead of throwing. */
export async function getTenant(): Promise<TenantContext | null> {
  try {
    return await requireTenant();
  } catch {
    return null;
  }
}

/**
 * Confirms a project belongs to the caller's organization before it is read
 * or mutated. Returns the project so callers don't fetch it twice.
 */
export async function requireProjectInTenant(projectId: string, tenant: TenantContext) {
  const project = await prisma.project.findFirst({
    where: { id: projectId, organizationId: tenant.organizationId },
  });
  if (!project) {
    // Deliberately the same message whether the project is missing or owned
    // by another tenant — distinguishing them would leak existence.
    throw new TenantError("Project not found.");
  }
  return project;
}

export async function requireDatasetInTenant(datasetId: string, tenant: TenantContext) {
  const dataset = await prisma.dataset.findFirst({
    where: { id: datasetId, organizationId: tenant.organizationId },
  });
  if (!dataset) throw new TenantError("Dataset not found.");
  return dataset;
}
