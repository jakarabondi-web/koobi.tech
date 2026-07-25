"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import type { TaskType } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { assertCan } from "@/lib/permissions/can";
import { requireTenant, requireProjectInTenant, TenantError } from "@/server/services/tenant";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

const TASK_TYPES = [
  "PAIRWISE_COMPARISON", "SINGLE_RESPONSE_EVALUATION", "MULTI_RESPONSE_RANKING",
  "PROMPT_WRITING", "IDEAL_RESPONSE_WRITING", "RUBRIC_SCORING", "FACT_CHECKING",
  "CITATION_VERIFICATION", "SAFETY_CLASSIFICATION", "POLICY_CLASSIFICATION",
  "HALLUCINATION_DETECTION", "CODE_REVIEW", "CODE_OUTPUT_EVALUATION", "MULTI_TURN_EVALUATION",
] as const;

const createSchema = z.object({
  name: z.string().min(3, "Give the project a descriptive name."),
  description: z.string().min(20, "Describe the work in at least 20 characters."),
  domain: z.string().min(1, "Choose a domain."),
  taskType: z.enum(TASK_TYPES),
  instructions: z.string().min(20, "Instructions must be at least 20 characters."),
  languages: z.string().default("en"),
  payPerTaskCents: z.coerce.number().int().min(25, "Pay per task must be at least $0.25."),
  positionsAvailable: z.coerce.number().int().min(1).max(500),
  estimatedHoursPerWeek: z.coerce.number().int().min(1).max(40),
  budgetCents: z.coerce.number().int().min(1000),
  qualityThreshold: z.coerce.number().min(0.5).max(1),
  securityLevel: z.enum(["standard", "elevated", "restricted"]),
  containsSensitiveContent: z.coerce.boolean().default(false),
  saveAsDraft: z.string().optional(),
});

export async function createProject(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };
  assertCan(session.user.roles, "project.create");

  let tenant;
  try {
    tenant = await requireTenant();
  } catch (err) {
    if (err instanceof TenantError) return { status: "error", message: err.message };
    throw err;
  }

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description"),
    domain: formData.get("domain"),
    taskType: formData.get("taskType"),
    instructions: formData.get("instructions"),
    languages: formData.get("languages") ?? "en",
    payPerTaskCents: formData.get("payPerTaskCents"),
    positionsAvailable: formData.get("positionsAvailable"),
    estimatedHoursPerWeek: formData.get("estimatedHoursPerWeek"),
    budgetCents: formData.get("budgetCents"),
    qualityThreshold: formData.get("qualityThreshold"),
    securityLevel: formData.get("securityLevel"),
    containsSensitiveContent: formData.get("containsSensitiveContent") === "on",
    saveAsDraft: formData.get("saveAsDraft") ?? undefined,
  });

  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the project details." };
  }

  const d = parsed.data;
  const isDraft = d.saveAsDraft === "true";

  const project = await prisma.project.create({
    data: {
      organizationId: tenant.organizationId,
      name: d.name,
      description: d.description,
      domain: d.domain,
      taskType: d.taskType as TaskType,
      status: isDraft ? "DRAFT" : "ACTIVE",
      payPerTaskCents: d.payPerTaskCents,
      estimatedHoursPerWeek: d.estimatedHoursPerWeek,
      languages: d.languages.split(",").map((l) => l.trim()).filter(Boolean),
      positionsAvailable: d.positionsAvailable,
      budgetCents: d.budgetCents,
      qualityThreshold: d.qualityThreshold,
      securityLevel: d.securityLevel,
      containsSensitiveContent: d.containsSensitiveContent,
      startDate: isDraft ? null : new Date(),
      taskTemplates: {
        create: {
          name: `${d.name} — default template`,
          taskType: d.taskType as TaskType,
          schema: { type: d.taskType },
          instructions: d.instructions,
        },
      },
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: session.user.id,
      organizationId: tenant.organizationId,
      action: isDraft ? "project.created_draft" : "project.created",
      entityType: "Project",
      entityId: project.id,
      metadata: { name: d.name, taskType: d.taskType },
    },
  });

  revalidatePath("/client/projects");
  redirect(`/client/projects/${project.id}`);
}

const statusSchema = z.object({
  projectId: z.string().uuid(),
  status: z.enum(["ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]),
});

export async function setProjectStatus(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };
  assertCan(session.user.roles, "project.edit");

  const parsed = statusSchema.safeParse({
    projectId: formData.get("projectId"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { status: "error", message: "Invalid status change." };

  try {
    const tenant = await requireTenant();
    await requireProjectInTenant(parsed.data.projectId, tenant);

    await prisma.$transaction([
      prisma.project.update({
        where: { id: parsed.data.projectId },
        data: { status: parsed.data.status },
      }),
      prisma.auditLog.create({
        data: {
          actorId: session.user.id,
          organizationId: tenant.organizationId,
          action: "project.status_changed",
          entityType: "Project",
          entityId: parsed.data.projectId,
          metadata: { status: parsed.data.status },
        },
      }),
    ]);
  } catch (err) {
    if (err instanceof TenantError) return { status: "error", message: err.message };
    throw err;
  }

  revalidatePath(`/client/projects/${parsed.data.projectId}`);
  return { status: "success", message: `Project ${parsed.data.status.toLowerCase()}.` };
}
