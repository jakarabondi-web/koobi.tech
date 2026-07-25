import { prisma } from "@/lib/db/prisma";
import { serializeSubmission } from "@/lib/api/serializers";
import {
  apiError,
  apiOk,
  authenticateApiRequest,
  enumFilter,
  isFailure,
  pagination,
  projectForKey,
  REVIEW_DECISIONS,
} from "@/server/services/api-auth";

/**
 * GET /api/v1/submissions?project_id=… — retrieve completed work.
 *
 * `decision=APPROVED` is the filter most clients want: unreviewed work has
 * not passed quality control and should not be trained on.
 */
export async function GET(request: Request) {
  const ctx = await authenticateApiRequest(request);
  if (isFailure(ctx)) return ctx.response;

  const url = new URL(request.url);
  const projectId = url.searchParams.get("project_id");
  if (!projectId) return apiError(400, "missing_parameter", "project_id is required.");

  const project = await projectForKey(projectId, ctx);
  if (!project) return apiError(404, "not_found", "Project not found.");

  const { limit, offset } = pagination(url);
  const since = url.searchParams.get("since");

  const decision = enumFilter(url.searchParams.get("decision"), REVIEW_DECISIONS, "decision");
  if (isFailure(decision)) return decision.response;

  let submittedAfter: Date | undefined;
  if (since) {
    const parsedDate = new Date(since);
    if (Number.isNaN(parsedDate.getTime())) {
      return apiError(400, "invalid_parameter", "since must be an ISO 8601 timestamp.");
    }
    submittedAfter = parsedDate;
  }

  const where = {
    task: { projectId: project.id },
    ...(decision.value ? { reviews: { some: { decision: decision.value } } } : {}),
    ...(submittedAfter ? { submittedAt: { gt: submittedAfter } } : {}),
  };

  const [rows, total] = await Promise.all([
    prisma.taskSubmission.findMany({
      where,
      include: {
        task: { select: { id: true, projectId: true, externalRef: true, isGold: true } },
        reviews: {
          select: {
            decision: true,
            createdAt: true,
            scores: { select: { category: true, score: true } },
          },
          orderBy: { createdAt: "desc" },
        },
      },
      orderBy: { submittedAt: "asc" },
      take: limit,
      skip: offset,
    }),
    prisma.taskSubmission.count({ where }),
  ]);

  return apiOk({
    data: rows.map(serializeSubmission),
    pagination: { total, limit, offset, has_more: offset + rows.length < total },
  });
}
