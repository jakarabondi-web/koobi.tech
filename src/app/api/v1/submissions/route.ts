import { prisma } from "@/lib/db/prisma";
import { serializeSubmission } from "@/lib/api/serializers";
import {
  apiError,
  apiOk,
  authenticateApiRequest,
  isFailure,
  pagination,
  projectForKey,
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
  const decision = url.searchParams.get("decision");
  const since = url.searchParams.get("since");

  if (decision && !["APPROVED", "REJECTED", "REVISION_REQUESTED", "ESCALATED"].includes(decision)) {
    return apiError(400, "invalid_parameter", "decision must be one of APPROVED, REJECTED, REVISION_REQUESTED, ESCALATED.");
  }

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
    ...(decision ? { reviews: { some: { decision: decision as never } } } : {}),
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
