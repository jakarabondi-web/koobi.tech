import { notFound } from "next/navigation";

import { prisma } from "@/lib/db/prisma";
import { requireTenant, requireProjectInTenant, TenantError } from "@/server/services/tenant";

/**
 * Loads a project for the client portal, enforcing tenant ownership.
 * Every /client/projects/[id]/* page must go through this — a project from
 * another organization 404s exactly like one that doesn't exist.
 */
export async function loadClientProject(projectId: string) {
  const tenant = await requireTenant();
  try {
    await requireProjectInTenant(projectId, tenant);
  } catch (err) {
    if (err instanceof TenantError) notFound();
    throw err;
  }
  const project = await prisma.project.findUniqueOrThrow({ where: { id: projectId } });
  return { tenant, project };
}
