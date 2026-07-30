"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { requireTenant, requireDatasetInTenant, TenantError } from "@/server/services/tenant";
import { processExport } from "@/server/services/export-processor";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

const schema = z.object({
  datasetId: z.string().uuid(),
  format: z.enum(["jsonl", "csv"]),
});

/**
 * Requests a dataset export. Processed synchronously in this request (see
 * export-processor.ts) — by the time the action returns, the export is
 * READY with a download URL, or FAILED with a reason.
 */
export async function requestExport(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const parsed = schema.safeParse({
    datasetId: formData.get("datasetId"),
    format: formData.get("format"),
  });
  if (!parsed.success) return { status: "error", message: "Choose a dataset and format." };

  let outcome: { status: "READY" | "FAILED"; error: string | null };
  try {
    const tenant = await requireTenant();
    await requireDatasetInTenant(parsed.data.datasetId, tenant);

    const created = await prisma.export.create({
      data: {
        datasetId: parsed.data.datasetId,
        format: parsed.data.format,
        status: "QUEUED",
        requestedBy: session.user.id,
      },
    });

    await processExport(created.id);
    const processed = await prisma.export.findUniqueOrThrow({
      where: { id: created.id },
      select: { status: true, error: true },
    });
    outcome = { status: processed.status === "READY" ? "READY" : "FAILED", error: processed.error };

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        organizationId: tenant.organizationId,
        action: "dataset.export_requested",
        entityType: "Dataset",
        entityId: parsed.data.datasetId,
        metadata: { format: parsed.data.format, exportId: created.id, status: processed.status },
      },
    });
  } catch (err) {
    if (err instanceof TenantError) return { status: "error", message: err.message };
    throw err;
  }

  revalidatePath("/client/exports");
  if (outcome.status === "FAILED") {
    return { status: "error", message: outcome.error ?? "Export failed." };
  }
  return { status: "success", message: "Export ready — download it from the Exports page." };
}
