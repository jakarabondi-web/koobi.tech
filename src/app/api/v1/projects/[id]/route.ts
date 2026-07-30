import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { serializeProject } from "@/lib/api/serializers";
import { parseCustomSchema } from "@/lib/tasks/custom-schema";
import {
  apiError,
  apiOk,
  authenticateApiRequest,
  isFailure,
  logApiAction,
  projectForKey,
  readJson,
} from "@/server/services/api-auth";

type Params = { params: Promise<{ id: string }> };

/** GET /api/v1/projects/:id */
export async function GET(request: Request, { params }: Params) {
  const ctx = await authenticateApiRequest(request);
  if (isFailure(ctx)) return ctx.response;

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, organizationId: ctx.organizationId },
    include: { _count: { select: { tasks: true } } },
  });

  // Same 404 whether the project is missing or belongs to another tenant —
  // distinguishing them would let a key enumerate other organizations' ids.
  if (!project) return apiError(404, "not_found", "Project not found.");

  const [counts, template] = await Promise.all([
    prisma.task.groupBy({
      by: ["status"],
      where: { projectId: project.id },
      _count: { _all: true },
    }),
    project.taskType === "CUSTOM"
      ? prisma.taskTemplate.findFirst({ where: { projectId: project.id }, orderBy: { createdAt: "asc" } })
      : null,
  ]);

  const customSchema = template ? parseCustomSchema(template.schema) : null;

  return apiOk({
    data: {
      ...serializeProject(project),
      task_status_counts: Object.fromEntries(counts.map((c) => [c.status, c._count._all])),
      ...(customSchema ? { custom_schema: customSchema } : {}),
    },
  });
}

const patchSchema = z.object({
  name: z.string().min(3).max(120).optional(),
  description: z.string().max(2000).nullable().optional(),
  status: z.enum(["DRAFT", "ACTIVE", "PAUSED", "COMPLETED", "ARCHIVED"]).optional(),
  quality_threshold: z.number().min(0.5).max(1).optional(),
  gold_task_rate: z.number().min(0).max(0.3).optional(),
  consensus_overlap: z.number().int().min(1).max(9).optional(),
});

/** PATCH /api/v1/projects/:id — update a project. Requires the write scope. */
export async function PATCH(request: Request, { params }: Params) {
  const ctx = await authenticateApiRequest(request, { write: true });
  if (isFailure(ctx)) return ctx.response;

  const { id } = await params;
  const existing = await projectForKey(id, ctx);
  if (!existing) return apiError(404, "not_found", "Project not found.");

  const body = await readJson(request);
  if (isFailure(body)) return body.response;

  const parsed = patchSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiError(422, "validation_failed", "The request body is not valid.", {
      issues: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  const d = parsed.data;
  const project = await prisma.project.update({
    where: { id },
    data: {
      ...(d.name !== undefined ? { name: d.name } : {}),
      ...(d.description !== undefined ? { description: d.description } : {}),
      ...(d.status !== undefined ? { status: d.status } : {}),
      ...(d.quality_threshold !== undefined ? { qualityThreshold: d.quality_threshold } : {}),
      ...(d.gold_task_rate !== undefined ? { goldTaskRate: d.gold_task_rate } : {}),
      ...(d.consensus_overlap !== undefined ? { consensusOverlap: d.consensus_overlap } : {}),
    },
  });

  await logApiAction(ctx, "project.updated_via_api", project.id, { fields: Object.keys(d) });

  return apiOk({ data: serializeProject(project) });
}
