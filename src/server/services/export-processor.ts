import { prisma } from "@/lib/db/prisma";
import { dispatchWebhookEvent } from "@/server/services/webhooks";

/**
 * Export processing.
 *
 * Runs synchronously in the request that asked for the export — there is no
 * background job queue in this deployment (the same constraint webhooks.ts
 * documents), and a dataset here is at most thousands of small JSON rows,
 * which serializes in milliseconds. The QUEUED → PROCESSING claim is a
 * guarded transition, so two concurrent requests for the same export can't
 * both build it.
 *
 * The generated file is snapshotted into Export.content: an export is what
 * the dataset looked like when it ran, not a live view that silently
 * changes when items are added later.
 */

export class ExportError extends Error {}

const SUPPORTED_FORMATS = ["jsonl", "csv"] as const;
export type ExportFormat = (typeof SUPPORTED_FORMATS)[number];

export function isSupportedFormat(format: string): format is ExportFormat {
  return (SUPPORTED_FORMATS as readonly string[]).includes(format);
}

function toJsonl(items: { content: unknown }[]): string {
  return items.map((item) => JSON.stringify(item.content)).join("\n");
}

/** RFC 4180: quote when the value contains a comma, quote, or newline. */
function csvCell(value: unknown): string {
  const text =
    value === null || value === undefined
      ? ""
      : typeof value === "object"
        ? JSON.stringify(value)
        : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(items: { content: unknown }[]): string {
  // Header is the union of top-level keys in first-seen order, so rows with
  // differing shapes still land in one coherent table instead of failing.
  const columns: string[] = [];
  for (const item of items) {
    if (typeof item.content !== "object" || item.content === null) continue;
    for (const key of Object.keys(item.content)) {
      if (!columns.includes(key)) columns.push(key);
    }
  }
  const rows = items.map((item) => {
    const record = (typeof item.content === "object" && item.content !== null ? item.content : {}) as Record<
      string,
      unknown
    >;
    return columns.map((c) => csvCell(record[c])).join(",");
  });
  return [columns.map(csvCell).join(","), ...rows].join("\n");
}

/**
 * Builds the file for a QUEUED export and marks it READY (or FAILED).
 * Safe to call redundantly — an export already claimed by another request
 * is left alone.
 */
export async function processExport(exportId: string): Promise<void> {
  // Guarded claim: only one caller can move QUEUED → PROCESSING.
  const claimed = await prisma.export.updateMany({
    where: { id: exportId, status: "QUEUED" },
    data: { status: "PROCESSING" },
  });
  if (claimed.count === 0) return;

  try {
    const row = await prisma.export.findUniqueOrThrow({
      where: { id: exportId },
      include: { dataset: { select: { id: true, name: true, organizationId: true } } },
    });

    if (!isSupportedFormat(row.format)) {
      throw new ExportError(`Format "${row.format}" is not supported. Use jsonl or csv.`);
    }

    const items = await prisma.datasetItem.findMany({
      where: { datasetId: row.datasetId },
      orderBy: { addedAt: "asc" },
      select: { content: true },
    });
    if (items.length === 0) {
      throw new ExportError("The dataset has no items to export.");
    }

    const content = row.format === "csv" ? toCsv(items) : toJsonl(items);
    const fileUrl = `/api/v1/exports/${row.id}/download`;

    await prisma.export.update({
      where: { id: row.id },
      data: { status: "READY", content, fileUrl, completedAt: new Date(), error: null },
    });

    void dispatchWebhookEvent(row.dataset.organizationId, "export.ready", {
      export_id: row.id,
      dataset_id: row.dataset.id,
      dataset_name: row.dataset.name,
      format: row.format,
      file_url: fileUrl,
    });
  } catch (err) {
    await prisma.export.update({
      where: { id: exportId },
      data: {
        status: "FAILED",
        error: err instanceof ExportError ? err.message : "Export processing failed.",
        completedAt: new Date(),
      },
    });
    // ExportError carries a message the requester is meant to see; anything
    // else is a bug and should still surface in server logs.
    if (!(err instanceof ExportError)) throw err;
  }
}
