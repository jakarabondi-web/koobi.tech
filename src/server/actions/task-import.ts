"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { assertCan } from "@/lib/permissions/can";
import { requireTenant, requireProjectInTenant, TenantError } from "@/server/services/tenant";
import { previewImport, commitImport, ImportError, type ImportPreview } from "@/server/services/task-import";
import { MAX_IMPORT_BYTES } from "@/lib/tasks/import-parser";

export type ImportState = {
  status: "idle" | "previewed" | "imported" | "error";
  message?: string;
  preview?: ImportPreview;
  /** Carried forward so commit re-validates the same content. */
  content?: string;
  format?: "jsonl" | "csv";
  result?: { created: number; goldCreated: number; skipped: number };
};

const schema = z.object({
  projectId: z.string().uuid(),
  format: z.enum(["jsonl", "csv"]),
  content: z.string().min(1, "Paste or upload some data first."),
});

/**
 * Authorizes an import, by one of two distinct paths.
 *
 * Client users must own the project through organization membership — the
 * normal tenant rule.
 *
 * Internal operations staff import on a client's behalf and are not members
 * of any client organization, so they take a separate path. That carve-out
 * is deliberate and narrow: it is limited to roles that already administer
 * every tenant, and it is recorded distinctly in the audit log
 * (`project.tasks_imported_by_staff`) so third-party writes into a client's
 * project are never indistinguishable from the client's own.
 */
async function authorizeImport(projectId: string) {
  const session = await auth();
  if (!session?.user) throw new TenantError("Not signed in.");
  assertCan(session.user.roles, "project.edit");

  const isInternalStaff =
    session.user.roles.includes("OPERATIONS_MANAGER") || session.user.roles.includes("SUPER_ADMIN");

  if (isInternalStaff) {
    const project = await prisma.project.findUnique({
      where: { id: projectId },
      select: { organizationId: true },
    });
    if (!project) throw new TenantError("Project not found.");
    return {
      session,
      organizationId: project.organizationId,
      onBehalfOfClient: true,
    };
  }

  const tenant = await requireTenant();
  await requireProjectInTenant(projectId, tenant);
  return { session, organizationId: tenant.organizationId, onBehalfOfClient: false };
}

export async function previewTaskImport(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const parsed = schema.safeParse({
    projectId: formData.get("projectId"),
    format: formData.get("format"),
    content: formData.get("content"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check your file." };
  }

  if (Buffer.byteLength(parsed.data.content, "utf8") > MAX_IMPORT_BYTES) {
    return {
      status: "error",
      message: `File is larger than ${MAX_IMPORT_BYTES / 1024 / 1024}MB. Split it into smaller batches.`,
    };
  }

  try {
    await authorizeImport(parsed.data.projectId);
    const preview = await previewImport({
      projectId: parsed.data.projectId,
      content: parsed.data.content,
      format: parsed.data.format,
    });
    return {
      status: "previewed",
      preview,
      content: parsed.data.content,
      format: parsed.data.format,
    };
  } catch (err) {
    if (err instanceof TenantError || err instanceof ImportError) {
      return { status: "error", message: err.message };
    }
    throw err;
  }
}

export async function commitTaskImport(_prev: ImportState, formData: FormData): Promise<ImportState> {
  const parsed = schema.safeParse({
    projectId: formData.get("projectId"),
    format: formData.get("format"),
    content: formData.get("content"),
  });
  if (!parsed.success) return { status: "error", message: "Nothing to import." };

  try {
    const { session, organizationId, onBehalfOfClient } = await authorizeImport(parsed.data.projectId);

    // Re-validated inside commitImport rather than trusting the preview —
    // the content round-trips through the client between the two calls.
    const result = await commitImport({
      projectId: parsed.data.projectId,
      content: parsed.data.content,
      format: parsed.data.format,
      actorId: session.user.id,
      organizationId,
      onBehalfOfClient,
    });

    revalidatePath(`/client/projects/${parsed.data.projectId}`);
    revalidatePath(`/client/projects/${parsed.data.projectId}/tasks`);
    return { status: "imported", result };
  } catch (err) {
    if (err instanceof TenantError || err instanceof ImportError) {
      return { status: "error", message: err.message };
    }
    throw err;
  }
}
