import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { serializeTask } from "@/lib/api/serializers";
import { MAX_IMPORT_ROWS } from "@/lib/tasks/import-parser";
import { commitImport, ImportError } from "@/server/services/task-import";
import {
  apiError,
  apiOk,
  authenticateApiRequest,
  enumFilter,
  isFailure,
  pagination,
  projectForKey,
  readJson,
  TASK_STATUSES,
} from "@/server/services/api-auth";

/** GET /api/v1/tasks?project_id=… — list tasks and their status. */
export async function GET(request: Request) {
  const ctx = await authenticateApiRequest(request);
  if (isFailure(ctx)) return ctx.response;

  const url = new URL(request.url);
  const projectId = url.searchParams.get("project_id");
  if (!projectId) {
    return apiError(400, "missing_parameter", "project_id is required.");
  }

  const project = await projectForKey(projectId, ctx);
  if (!project) return apiError(404, "not_found", "Project not found.");

  const { limit, offset } = pagination(url);
  const externalRef = url.searchParams.get("external_ref");

  const status = enumFilter(url.searchParams.get("status"), TASK_STATUSES, "status");
  if (isFailure(status)) return status.response;

  const where = {
    projectId: project.id,
    ...(status.value ? { status: status.value } : {}),
    ...(externalRef ? { externalRef } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.task.findMany({ where, orderBy: { createdAt: "desc" }, take: limit, skip: offset }),
    prisma.task.count({ where }),
  ]);

  return apiOk({
    data: rows.map(serializeTask),
    pagination: { total, limit, offset, has_more: offset + rows.length < total },
  });
}

const ingestSchema = z.object({
  project_id: z.string().uuid(),
  tasks: z
    .array(z.record(z.string(), z.unknown()))
    .min(1, "Send at least one task.")
    .max(MAX_IMPORT_ROWS, `Send at most ${MAX_IMPORT_ROWS} tasks per request.`),
});

/**
 * POST /api/v1/tasks — ingest tasks. Requires the write scope.
 *
 * The array is converted to JSONL and run through the same parser the upload
 * screen uses, so the API and the UI cannot drift into accepting different
 * data. Ingestion is idempotent on `external_ref`: re-sending a batch adds
 * only the rows that are new.
 */
export async function POST(request: Request) {
  const ctx = await authenticateApiRequest(request, { write: true });
  if (isFailure(ctx)) return ctx.response;

  const body = await readJson(request);
  if (isFailure(body)) return body.response;

  const parsed = ingestSchema.safeParse(body.data);
  if (!parsed.success) {
    return apiError(422, "validation_failed", "The request body is not valid.", {
      issues: parsed.error.issues.map((i) => ({ field: i.path.join("."), message: i.message })),
    });
  }

  const project = await projectForKey(parsed.data.project_id, ctx);
  if (!project) return apiError(404, "not_found", "Project not found.");

  const jsonl = parsed.data.tasks.map((t) => JSON.stringify(t)).join("\n");

  try {
    const result = await commitImport({
      projectId: project.id,
      content: jsonl,
      format: "jsonl",
      actorId: ctx.keyId,
      organizationId: ctx.organizationId,
      viaApiKey: true,
    });

    return apiOk(
      {
        data: {
          created: result.created,
          gold_created: result.goldCreated,
          skipped_duplicates: result.skipped,
          // Index of the offending item in the array you sent.
          rejected: result.rowErrors.map((e) => ({ index: e.line - 1, message: e.message })),
        },
      },
      201
    );
  } catch (err) {
    if (err instanceof ImportError) {
      return apiError(422, "import_failed", err.message, {
        rejected: err.rowErrors.map((e) => ({ index: e.line - 1, message: e.message })),
      });
    }
    throw err;
  }
}
