import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { serializeExport } from "@/lib/api/serializers";
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
  format: z.enum(["jsonl", "csv", "parquet"]).default("jsonl"),
});

/**
 * POST /api/v1/exports — queue an export. Requires the write scope.
 *
 * MOCKED: the row is created in QUEUED and stays there. No background worker
 * exists yet, so `file_url` will remain null and no webhook fires. This is
 * documented in API.md rather than faked with a placeholder URL.
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

  const row = await prisma.export.create({
    data: {
      datasetId: dataset.id,
      format: parsed.data.format,
      status: "QUEUED",
      requestedBy: ctx.keyId,
    },
    include: { dataset: { select: { name: true, projectId: true } } },
  });

  await logApiAction(ctx, "dataset.export_requested_via_api", dataset.id, {
    format: parsed.data.format,
    exportId: row.id,
  });

  return apiOk(
    {
      data: serializeExport(row),
      note: "Export processing is not yet implemented — this row stays QUEUED. See API.md.",
    },
    202
  );
}
