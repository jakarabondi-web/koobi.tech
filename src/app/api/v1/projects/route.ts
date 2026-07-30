import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { serializeProject } from "@/lib/api/serializers";
import { customTaskSchema } from "@/lib/tasks/custom-schema";
import {
  apiError,
  apiOk,
  authenticateApiRequest,
  enumFilter,
  isFailure,
  logApiAction,
  pagination,
  PROJECT_STATUSES,
  readJson,
} from "@/server/services/api-auth";

/** GET /api/v1/projects — list the calling organization's projects. */
export async function GET(request: Request) {
  const ctx = await authenticateApiRequest(request);
  if (isFailure(ctx)) return ctx.response;

  const url = new URL(request.url);
  const { limit, offset } = pagination(url);

  const status = enumFilter(url.searchParams.get("status"), PROJECT_STATUSES, "status");
  if (isFailure(status)) return status.response;

  const where = {
    organizationId: ctx.organizationId,
    ...(status.value ? { status: status.value } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.project.findMany({
      where,
      include: { _count: { select: { tasks: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.project.count({ where }),
  ]);

  return apiOk({
    data: rows.map(serializeProject),
    pagination: { total, limit, offset, has_more: offset + rows.length < total },
  });
}

const createSchema = z
  .object({
    name: z.string().min(3).max(120),
    description: z.string().max(2000).optional(),
    domain: z.string().min(2).max(80),
    task_type: z.enum([
      "SINGLE_RESPONSE_EVALUATION",
      "PAIRWISE_COMPARISON",
      "MULTI_RESPONSE_RANKING",
      "PROMPT_WRITING",
      "IDEAL_RESPONSE_WRITING",
      "RUBRIC_SCORING",
      "FACT_CHECKING",
      "CITATION_VERIFICATION",
      "SAFETY_CLASSIFICATION",
      "POLICY_CLASSIFICATION",
      "HALLUCINATION_DETECTION",
      "CODE_REVIEW",
      "CUSTOM",
    ]),
    /**
     * The client-defined task shape — required with task_type CUSTOM,
     * rejected with any other type. See src/lib/tasks/custom-schema.ts for
     * the field contract.
     */
    custom_schema: customTaskSchema.optional(),
    languages: z.array(z.string().min(2).max(20)).max(30).optional(),
    quality_threshold: z.number().min(0.5).max(1).optional(),
    gold_task_rate: z.number().min(0).max(0.3).optional(),
    consensus_overlap: z.number().int().min(1).max(9).optional(),
    pay_per_task_cents: z.number().int().min(0).max(100_000).optional(),
  })
  .superRefine((d, ctx) => {
    if (d.task_type === "CUSTOM" && !d.custom_schema) {
      ctx.addIssue({
        code: "custom",
        path: ["custom_schema"],
        message: "custom_schema is required when task_type is CUSTOM.",
      });
    }
    if (d.task_type !== "CUSTOM" && d.custom_schema) {
      ctx.addIssue({
        code: "custom",
        path: ["custom_schema"],
        message: "custom_schema is only valid with task_type CUSTOM.",
      });
    }
  });

/** POST /api/v1/projects — create a project. Requires the write scope. */
export async function POST(request: Request) {
  const ctx = await authenticateApiRequest(request, { write: true });
  if (isFailure(ctx)) return ctx.response;

  const body = await readJson(request);
  if (isFailure(body)) return body.response;

  const parsed = createSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiError(422, "validation_failed", "The request body is not valid.", {
      issues: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  const d = parsed.data;
  // organizationId comes from the key, never from the body — see api-auth.ts.
  const project = await prisma.project.create({
    data: {
      organizationId: ctx.organizationId,
      name: d.name,
      description: d.description ?? null,
      domain: d.domain,
      taskType: d.task_type,
      languages: d.languages ?? [],
      qualityThreshold: d.quality_threshold ?? 0.85,
      goldTaskRate: d.gold_task_rate ?? 0.07,
      consensusOverlap: d.consensus_overlap ?? 1,
      payPerTaskCents: d.pay_per_task_cents ?? null,
      // API-created projects start as DRAFT: staffing and pricing are agreed
      // with an operations manager before a project can recruit.
      status: "DRAFT",
      // The custom shape lives on a TaskTemplate row — the import pipeline
      // and trainer workspace both read it from there.
      ...(d.custom_schema
        ? {
            taskTemplates: {
              create: { name: `${d.name} — task schema`, taskType: "CUSTOM", schema: d.custom_schema },
            },
          }
        : {}),
    },
  });

  await logApiAction(ctx, "project.created_via_api", project.id, {
    name: project.name,
    ...(d.custom_schema ? { customSchema: true } : {}),
  });

  return apiOk(
    { data: { ...serializeProject(project), ...(d.custom_schema ? { custom_schema: d.custom_schema } : {}) } },
    201
  );
}
