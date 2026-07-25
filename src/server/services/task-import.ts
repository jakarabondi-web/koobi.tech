import { prisma } from "@/lib/db/prisma";
import { parseImport, type ParsedTask, type RowError } from "@/lib/tasks/import-parser";

export class ImportError extends Error {
  /**
   * Per-row failures, when there are any. A caller that only gets "every row
   * failed validation" has no way to fix its file — the API returns these so
   * the client can see which line broke and why.
   */
  readonly rowErrors: RowError[];

  constructor(message: string, rowErrors: RowError[] = []) {
    super(message);
    this.rowErrors = rowErrors;
  }
}

export type ImportPreview = {
  projectId: string;
  projectName: string;
  taskType: string;
  totalRows: number;
  validRows: number;
  goldRows: number;
  errors: RowError[];
  duplicateRefsInFile: string[];
  /** Refs already imported previously — these are skipped, not re-created. */
  alreadyImported: string[];
  /** First few rows, for the confirmation screen. */
  sample: ParsedTask[];
};

/**
 * Validates a file against a project without writing anything.
 *
 * Import is always preview-then-commit: a client should see exactly what
 * would land, including which rows fail and why, before any task exists.
 */
export async function previewImport(params: {
  projectId: string;
  content: string;
  format: "jsonl" | "csv";
}): Promise<ImportPreview> {
  const project = await prisma.project.findUnique({ where: { id: params.projectId } });
  if (!project) throw new ImportError("Project not found.");

  const parsed = parseImport(params.content, params.format, project.taskType);

  // Re-importing the same file must not duplicate work, so refs already in
  // the project are reported as skips rather than errors.
  const refs = parsed.tasks.map((t) => t.externalRef).filter((r): r is string => r !== null);
  const existing = refs.length
    ? await prisma.task.findMany({
        where: { projectId: params.projectId, externalRef: { in: refs } },
        select: { externalRef: true },
      })
    : [];
  const alreadyImported = existing
    .map((e) => e.externalRef)
    .filter((r): r is string => r !== null);

  const importable = parsed.tasks.filter(
    (t) => !t.externalRef || !alreadyImported.includes(t.externalRef)
  );

  return {
    projectId: project.id,
    projectName: project.name,
    taskType: project.taskType,
    totalRows: parsed.tasks.length + parsed.errors.length,
    validRows: importable.length,
    goldRows: importable.filter((t) => t.isGold).length,
    errors: parsed.errors,
    duplicateRefsInFile: parsed.duplicateRefs,
    alreadyImported,
    sample: importable.slice(0, 5),
  };
}

export type ImportResult = {
  created: number;
  goldCreated: number;
  skipped: number;
  /**
   * Rows that were rejected while the rest of the batch was written. Valid
   * rows are not held hostage to invalid ones, but the caller is told exactly
   * what didn't land rather than left to infer it from a count.
   */
  rowErrors: RowError[];
};

/**
 * Commits an import.
 *
 * Rows with errors are never written — the whole file is re-validated here
 * rather than trusting a preview the client could have tampered with between
 * the two calls.
 */
export async function commitImport(params: {
  projectId: string;
  content: string;
  format: "jsonl" | "csv";
  /** A user id, or an API key id when `viaApiKey` is set. */
  actorId: string;
  organizationId?: string;
  /** True when internal staff imported into a client's project. */
  onBehalfOfClient?: boolean;
  /** True when the caller is an API key rather than a signed-in user. */
  viaApiKey?: boolean;
}): Promise<ImportResult> {
  const project = await prisma.project.findUnique({ where: { id: params.projectId } });
  if (!project) throw new ImportError("Project not found.");

  const parsed = parseImport(params.content, params.format, project.taskType);
  if (parsed.tasks.length === 0) {
    throw new ImportError("Nothing to import — every row failed validation.", parsed.errors);
  }

  const refs = parsed.tasks.map((t) => t.externalRef).filter((r): r is string => r !== null);
  const existing = refs.length
    ? await prisma.task.findMany({
        where: { projectId: params.projectId, externalRef: { in: refs } },
        select: { externalRef: true },
      })
    : [];
  const existingRefs = new Set(existing.map((e) => e.externalRef));

  const toCreate = parsed.tasks.filter((t) => !t.externalRef || !existingRefs.has(t.externalRef));
  const skipped = parsed.tasks.length - toCreate.length;

  if (toCreate.length === 0) {
    return { created: 0, goldCreated: 0, skipped, rowErrors: parsed.errors };
  }

  // One transaction so a failure part-way through doesn't leave a project
  // holding half a batch.
  const goldCreated = await prisma.$transaction(async (tx) => {
    await tx.task.createMany({
      data: toCreate.map((t) => ({
        projectId: params.projectId,
        externalRef: t.externalRef,
        payload: t.payload as object,
        isGold: t.isGold,
        status: "UNASSIGNED" as const,
      })),
    });

    // Gold tasks need their expected answer attached, which createMany can't
    // do across two tables — fetch the rows back by ref and link them.
    const golds = toCreate.filter((t) => t.isGold && t.externalRef);
    if (golds.length === 0) return 0;

    const created = await tx.task.findMany({
      where: {
        projectId: params.projectId,
        externalRef: { in: golds.map((g) => g.externalRef as string) },
      },
      select: { id: true, externalRef: true },
    });

    await tx.goldTask.createMany({
      data: created.map((row) => ({
        taskId: row.id,
        projectId: params.projectId,
        expectedAnswer: {
          answer: golds.find((g) => g.externalRef === row.externalRef)?.expectedAnswer ?? "",
        },
      })),
    });

    return created.length;
  });

  await prisma.auditLog.create({
    data: {
      // actorId is a foreign key to User, so an API-key import records the
      // key in metadata instead of pointing at a user that doesn't exist.
      actorId: params.viaApiKey ? null : params.actorId,
      organizationId: params.organizationId,
      action: params.viaApiKey
        ? "project.tasks_imported_via_api"
        : params.onBehalfOfClient
          ? "project.tasks_imported_by_staff"
          : "project.tasks_imported",
      entityType: "Project",
      entityId: params.projectId,
      metadata: {
        created: toCreate.length,
        gold: goldCreated,
        skipped,
        ...(params.viaApiKey ? { viaApiKey: params.actorId } : {}),
      },
    },
  });

  return { created: toCreate.length, goldCreated, skipped, rowErrors: parsed.errors };
}
