"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { prisma } from "@/lib/db/prisma";
import { generateWebhookSecret } from "@/lib/api/keys";
import { requireTenant, TenantError } from "@/server/services/tenant";
import type { WebhookEvent } from "@/server/services/webhooks";

export type WebhookState = {
  status: "idle" | "success" | "error";
  message?: string;
  /** Shown once, on the response to the creating request, like an API key. */
  plaintextSecret?: string;
};

/** The only event actually wired up to fire today — see webhooks.ts. Kept
 *  as an array (not a single literal) so adding a second real event later
 *  is a one-line change to the picker, not a rewrite of the form. */
const AVAILABLE_EVENTS: WebhookEvent[] = ["task.reviewed"];

const MAX_ACTIVE_WEBHOOKS = 10;

const createSchema = z.object({
  url: z.string().url("Enter a valid https:// URL."),
  events: z.array(z.enum(AVAILABLE_EVENTS as [WebhookEvent, ...WebhookEvent[]])).min(1, "Pick at least one event."),
});

export async function createWebhook(_prev: WebhookState, formData: FormData): Promise<WebhookState> {
  let tenant;
  try {
    tenant = await requireTenant();
  } catch (err) {
    if (err instanceof TenantError) return { status: "error", message: err.message };
    throw err;
  }

  if (!tenant.isOrgAdmin) {
    return { status: "error", message: "Only organization admins can configure webhooks." };
  }

  const parsed = createSchema.safeParse({
    url: formData.get("url"),
    events: formData.getAll("events"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  if (!parsed.data.url.startsWith("https://")) {
    return { status: "error", message: "Webhook URLs must use https://." };
  }

  const active = await prisma.webhook.count({ where: { organizationId: tenant.organizationId } });
  if (active >= MAX_ACTIVE_WEBHOOKS) {
    return {
      status: "error",
      message: `You already have ${MAX_ACTIVE_WEBHOOKS} webhooks. Remove one before adding another.`,
    };
  }

  const secret = generateWebhookSecret();

  const webhook = await prisma.webhook.create({
    data: {
      organizationId: tenant.organizationId,
      url: parsed.data.url,
      secret,
      events: parsed.data.events,
    },
  });

  await prisma.auditLog.create({
    data: {
      actorId: tenant.userId,
      organizationId: tenant.organizationId,
      action: "webhook.created",
      entityType: "Webhook",
      entityId: webhook.id,
      metadata: { url: webhook.url, events: webhook.events },
    },
  });

  revalidatePath("/client/api");
  return {
    status: "success",
    message: "Webhook added. Copy the signing secret now — it can't be shown again.",
    plaintextSecret: secret,
  };
}

export async function deleteWebhook(_prev: WebhookState, formData: FormData): Promise<WebhookState> {
  let tenant;
  try {
    tenant = await requireTenant();
  } catch (err) {
    if (err instanceof TenantError) return { status: "error", message: err.message };
    throw err;
  }

  if (!tenant.isOrgAdmin) {
    return { status: "error", message: "Only organization admins can configure webhooks." };
  }

  const id = z.string().uuid().safeParse(formData.get("webhookId"));
  if (!id.success) return { status: "error", message: "Unknown webhook." };

  const result = await prisma.webhook.deleteMany({
    where: { id: id.data, organizationId: tenant.organizationId },
  });
  if (result.count === 0) return { status: "error", message: "Webhook not found." };

  await prisma.auditLog.create({
    data: {
      actorId: tenant.userId,
      organizationId: tenant.organizationId,
      action: "webhook.deleted",
      entityType: "Webhook",
      entityId: id.data,
    },
  });

  revalidatePath("/client/api");
  return { status: "success", message: "Webhook removed." };
}
