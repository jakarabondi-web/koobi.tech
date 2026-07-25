"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions/can";
import { requireTenant, requireProjectInTenant, TenantError } from "@/server/services/tenant";
import { rubricCriteriaSchema } from "@/lib/tasks/rubric";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

const schema = z.object({
  projectId: z.string().uuid(),
  name: z.string().min(2, "Give the rubric a name."),
  criteria: z.string(),
});

/**
 * Saves a rubric as a **new version** rather than editing in place.
 *
 * Scores already recorded were given against specific wording. Rewriting
 * that wording under them would make historical scores incomparable and
 * quietly corrupt every quality metric derived from them, so the old
 * version is deactivated and kept.
 */
export async function saveRubric(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };
  assertCan(session.user.roles, "project.edit");

  const parsed = schema.safeParse({
    projectId: formData.get("projectId"),
    name: formData.get("name"),
    criteria: formData.get("criteria"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the rubric." };
  }

  let criteria: unknown;
  try {
    criteria = JSON.parse(parsed.data.criteria);
  } catch {
    return { status: "error", message: "Rubric data was malformed." };
  }

  const validated = rubricCriteriaSchema.safeParse(criteria);
  if (!validated.success) {
    return { status: "error", message: validated.error.issues[0]?.message ?? "Invalid rubric." };
  }

  try {
    const tenant = await requireTenant();
    await requireProjectInTenant(parsed.data.projectId, tenant);

    const current = await prisma.reviewRubric.findFirst({
      where: { projectId: parsed.data.projectId, isActive: true },
      orderBy: { version: "desc" },
    });

    await prisma.$transaction(async (tx) => {
      if (current) {
        await tx.reviewRubric.update({ where: { id: current.id }, data: { isActive: false } });
      }
      await tx.reviewRubric.create({
        data: {
          projectId: parsed.data.projectId,
          name: parsed.data.name,
          criteria: validated.data,
          version: (current?.version ?? 0) + 1,
          isActive: true,
          createdBy: session.user.id,
        },
      });
      await tx.auditLog.create({
        data: {
          actorId: session.user.id,
          organizationId: tenant.organizationId,
          action: current ? "project.rubric_revised" : "project.rubric_created",
          entityType: "Project",
          entityId: parsed.data.projectId,
          metadata: { version: (current?.version ?? 0) + 1, criteria: validated.data.length },
        },
      });
    });
  } catch (err) {
    if (err instanceof TenantError) return { status: "error", message: err.message };
    throw err;
  }

  revalidatePath(`/client/projects/${parsed.data.projectId}/rubric`);
  return {
    status: "success",
    message: "Rubric saved. Existing scores keep the version they were given against.",
  };
}
