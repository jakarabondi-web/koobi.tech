"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { auth } from "@/lib/auth";
import { requireTenant, requireDatasetInTenant, TenantError } from "@/server/services/tenant";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

const schema = z.object({
  datasetId: z.string().uuid(),
  format: z.enum(["jsonl", "csv", "parquet"]),
});

/**
 * Queues a dataset export.
 *
 * MOCKED: no background worker exists yet, so the export is created in
 * QUEUED and stays there. A real deployment hands this to BullMQ, writes the
 * file to object storage, and flips the row to READY with a signed URL.
 */
export async function requestExport(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const parsed = schema.safeParse({
    datasetId: formData.get("datasetId"),
    format: formData.get("format"),
  });
  if (!parsed.success) return { status: "error", message: "Choose a dataset and format." };

  try {
    const tenant = await requireTenant();
    await requireDatasetInTenant(parsed.data.datasetId, tenant);

    await prisma.export.create({
      data: {
        datasetId: parsed.data.datasetId,
        format: parsed.data.format,
        status: "QUEUED",
        requestedBy: session.user.id,
      },
    });

    await prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        organizationId: tenant.organizationId,
        action: "dataset.export_requested",
        entityType: "Dataset",
        entityId: parsed.data.datasetId,
        metadata: { format: parsed.data.format },
      },
    });
  } catch (err) {
    if (err instanceof TenantError) return { status: "error", message: err.message };
    throw err;
  }

  revalidatePath("/client/exports");
  return {
    status: "success",
    message: "Export queued. Processing runs in the background — you'll be notified when it's ready.",
  };
}
