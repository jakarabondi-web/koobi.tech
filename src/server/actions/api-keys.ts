"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { generateApiKey } from "@/lib/api/keys";
import { requireTenant, TenantError } from "@/server/services/tenant";

export type KeyState = {
  status: "idle" | "success" | "error";
  message?: string;
  /**
   * Returned to the browser exactly once, on the response to the creating
   * request. It is never persisted and never rendered again — a client who
   * loses it must revoke and reissue.
   */
  plaintext?: string;
};

const createSchema = z.object({
  name: z.string().min(2, "Give the key a name so you can tell it apart later.").max(60),
  scope: z.enum(["READ", "WRITE"]),
  environment: z.enum(["live", "test"]),
  expiresInDays: z.enum(["0", "30", "90", "365"]),
});

/** Maximum live keys per organization — unbounded keys are unbounded blast radius. */
const MAX_ACTIVE_KEYS = 10;

export async function createApiKey(_prev: KeyState, formData: FormData): Promise<KeyState> {
  let tenant;
  try {
    tenant = await requireTenant();
  } catch (err) {
    if (err instanceof TenantError) return { status: "error", message: err.message };
    throw err;
  }

  // Issuing credentials is an admin act, not something any member can do.
  if (!tenant.isOrgAdmin) {
    return { status: "error", message: "Only organization admins can issue API keys." };
  }

  const parsed = createSchema.safeParse({
    name: formData.get("name"),
    scope: formData.get("scope"),
    environment: formData.get("environment"),
    expiresInDays: formData.get("expiresInDays"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const active = await prisma.apiKey.count({
    where: { organizationId: tenant.organizationId, revokedAt: null },
  });
  if (active >= MAX_ACTIVE_KEYS) {
    return {
      status: "error",
      message: `You already have ${MAX_ACTIVE_KEYS} active keys. Revoke one before issuing another.`,
    };
  }

  const days = Number(parsed.data.expiresInDays);
  const generated = generateApiKey(parsed.data.environment);

  const key = await prisma.apiKey.create({
    data: {
      organizationId: tenant.organizationId,
      userId: tenant.userId,
      name: parsed.data.name,
      hashedKey: generated.hashedKey,
      prefix: generated.prefix,
      // WRITE implies READ; a write-only key would be useless.
      scopes: parsed.data.scope === "WRITE" ? ["READ", "WRITE"] : ["READ"],
      expiresAt: days > 0 ? new Date(Date.now() + days * 86_400_000) : null,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: tenant.userId,
      organizationId: tenant.organizationId,
      action: "api_key.created",
      entityType: "ApiKey",
      entityId: key.id,
      // The prefix is safe to log; the key itself never touches a log line.
      metadata: { name: key.name, prefix: key.prefix, scopes: key.scopes },
    },
  });

  revalidatePath("/client/api");
  return {
    status: "success",
    message: "Key created. Copy it now — it can't be shown again.",
    plaintext: generated.plaintext,
  };
}

export async function revokeApiKey(_prev: KeyState, formData: FormData): Promise<KeyState> {
  let tenant;
  try {
    tenant = await requireTenant();
  } catch (err) {
    if (err instanceof TenantError) return { status: "error", message: err.message };
    throw err;
  }

  if (!tenant.isOrgAdmin) {
    return { status: "error", message: "Only organization admins can revoke API keys." };
  }

  const id = z.string().uuid().safeParse(formData.get("keyId"));
  if (!id.success) return { status: "error", message: "Unknown key." };

  // Scoped by organization so one tenant can't revoke another's credentials.
  const result = await prisma.apiKey.updateMany({
    where: { id: id.data, organizationId: tenant.organizationId, revokedAt: null },
    data: { revokedAt: new Date() },
  });

  if (result.count === 0) return { status: "error", message: "Key not found or already revoked." };

  await prisma.auditLog.create({
    data: {
      actorId: tenant.userId,
      organizationId: tenant.organizationId,
      action: "api_key.revoked",
      entityType: "ApiKey",
      entityId: id.data,
    },
  });

  revalidatePath("/client/api");
  return { status: "success", message: "Key revoked. Requests using it now fail immediately." };
}
