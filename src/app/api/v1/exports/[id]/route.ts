import { prisma } from "@/lib/db/prisma";
import { serializeExport } from "@/lib/api/serializers";
import { apiError, apiOk, authenticateApiRequest, isFailure } from "@/server/services/api-auth";

/** GET /api/v1/exports/:id — poll a single export's status. */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const ctx = await authenticateApiRequest(request);
  if (isFailure(ctx)) return ctx.response;

  const { id } = await params;
  const row = await prisma.export.findFirst({
    where: { id, dataset: { organizationId: ctx.organizationId } },
    include: { dataset: { select: { name: true, projectId: true } } },
  });

  if (!row) return apiError(404, "not_found", "Export not found.");

  return apiOk({ data: serializeExport(row) });
}
