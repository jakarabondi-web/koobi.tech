import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { serializeExport } from "@/lib/api/serializers";
import { processExport } from "@/server/services/export-processor";
import {
  apiError,
  apiOk,
  authenticateApiRequest,
  isFailure,
  logApiAction,
  pagination,
  readJson,
} from "@/server/services/api-auth";

/** GET /api/v1/exports — list exports for the calling organization. */
export async function GET(request: Request) {
  const ctx = await authenticateApiRequest(request);
  if (isFailure(ctx)) return ctx.response;

  const url = new URL(request.url);
  const { limit, offset } = pagination(url);

  const where = { dataset: { organizationId: ctx.organizationId } };

  const [rows, total] = await Promise.all([
    prisma.export.findMany({
      where,
      include: { dataset: { select: { name: true, projectId: true } } },
      orderBy: { createdAt: "desc" },
      take: limit,
      skip: offset,
    }),
    prisma.export.count({ where }),
  ]);

  return apiOk({
    data: rows.map(serializeExport),
    pagination: { total, limit, offset, has_more: offset + rows.length < total },
  });
}

const createSchema = z.object({
  dataset_id: z.string().uuid(),
  // Parquet is deliberately absent: nothing here can produce one, and a
  // format that silently FAILs is worse than one the schema refuses.
  format: z.enum(["jsonl", "csv"]).default("jsonl"),
});

/**
 * POST /api/v1/exports — request an export. Requires the write scope.
 *
 * Processing is synchronous (see export-processor.ts), so the response
 * already carries the final status and, on success, the download URL —
 * polling GET /exports/:id afterward works but is not required.
 */
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

  const dataset = await prisma.dataset.findFirst({
    where: { id: parsed.data.dataset_id, organizationId: ctx.organizationId },
  });
  if (!dataset) return apiError(404, "not_found", "Dataset not found.");

  const created = await prisma.export.create({
    data: {
      datasetId: dataset.id,
      format: parsed.data.format,
      status: "QUEUED",
      requestedBy: ctx.keyId,
    },
  });

  await processExport(created.id);

  const row = await prisma.export.findUniqueOrThrow({
    where: { id: created.id },
    include: { dataset: { select: { name: true, projectId: true } } },
  });

  await logApiAction(ctx, "dataset.export_requested_via_api", dataset.id, {
    format: parsed.data.format,
    exportId: row.id,
    status: row.status,
  });

  return apiOk({ data: serializeExport(row) }, 201);
}
