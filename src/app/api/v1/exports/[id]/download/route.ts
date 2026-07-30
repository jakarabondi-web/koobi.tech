import { prisma } from "@/lib/db/prisma";
import { bearerFrom } from "@/lib/api/keys";
import { getTenant } from "@/server/services/tenant";
import { apiError, authenticateApiRequest, isFailure } from "@/server/services/api-auth";

const CONTENT_TYPES: Record<string, string> = {
  jsonl: "application/jsonl",
  csv: "text/csv",
};

/** Strip anything that could break a Content-Disposition filename. */
function safeFilename(name: string, format: string): string {
  const base = name.replace(/[^A-Za-z0-9 _-]/g, "").trim().replaceAll(/\s+/g, "-") || "export";
  return `${base}.${format}`;
}

/**
 * GET /api/v1/exports/:id/download — the export file itself.
 *
 * Two callers need this and they authenticate differently: API clients send
 * a bearer key; the client dashboard's Download button navigates here with
 * only a session cookie. A bearer header, when present, is authoritative —
 * it is never ignored in favor of a cookie, so a request with a bad key
 * fails even from a signed-in browser.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  let organizationId: string;
  if (bearerFrom(request.headers.get("authorization"))) {
    const ctx = await authenticateApiRequest(request);
    if (isFailure(ctx)) return ctx.response;
    organizationId = ctx.organizationId;
  } else {
    const tenant = await getTenant();
    if (!tenant) {
      return apiError(401, "unauthorized", "Provide an API key or sign in to download exports.");
    }
    organizationId = tenant.organizationId;
  }

  const row = await prisma.export.findFirst({
    where: { id, dataset: { organizationId } },
    include: { dataset: { select: { name: true } } },
  });
  if (!row) return apiError(404, "not_found", "Export not found.");

  if (row.status !== "READY" || row.content === null) {
    return apiError(409, "not_ready", `This export is ${row.status.toLowerCase()}, not ready for download.`);
  }

  return new Response(row.content, {
    headers: {
      "Content-Type": CONTENT_TYPES[row.format] ?? "application/octet-stream",
      "Content-Disposition": `attachment; filename="${safeFilename(row.dataset.name, row.format)}"`,
      "Cache-Control": "no-store",
    },
  });
}
