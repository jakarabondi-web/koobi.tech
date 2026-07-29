import { createHmac } from "node:crypto";
import type { Prisma } from "@prisma/client";

import { prisma } from "@/lib/db/prisma";

/**
 * Outbound webhook delivery.
 *
 * There is no background job queue in this deployment (see exports.ts,
 * which is mocked for the same reason) — delivery happens inline, fire-
 * and-forget, from whatever request produced the event. That makes this
 * at-most-once, not at-least-once: a client's endpoint being down at the
 * moment of the event means the delivery is lost, not retried. Real retry
 * semantics need a queue; this is the honest version of what's actually
 * running. Every attempt (success or failure) is still recorded in
 * WebhookDelivery, so "did this fire, and what happened" is always
 * answerable even without retries.
 */

const DELIVERY_TIMEOUT_MS = 8000;

/** Names must stay in sync with what the client dashboard's event picker offers. */
export type WebhookEvent = "task.reviewed";

function signPayload(secret: string, body: string): string {
  return createHmac("sha256", secret).update(body).digest("hex");
}

/**
 * Fires `event` at every active webhook this organization has subscribed to
 * it. Never throws — a third party's endpoint being slow or broken must not
 * fail the request that triggered the event (e.g. a reviewer submitting a
 * decision), so every failure mode here is caught and recorded instead of
 * propagated.
 */
export async function dispatchWebhookEvent(
  organizationId: string,
  event: WebhookEvent,
  payload: Record<string, unknown>
): Promise<void> {
  const webhooks = await prisma.webhook.findMany({
    where: { organizationId, isActive: true, events: { has: event } },
  });
  if (webhooks.length === 0) return;

  const body = JSON.stringify({ event, data: payload, sent_at: new Date().toISOString() });

  await Promise.all(
    webhooks.map(async (webhook) => {
      let statusCode: number | null = null;
      let success = false;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), DELIVERY_TIMEOUT_MS);
        try {
          const res = await fetch(webhook.url, {
            method: "POST",
            headers: {
              "content-type": "application/json",
              "x-traivr-event": event,
              "x-traivr-signature": signPayload(webhook.secret, body),
            },
            body,
            signal: controller.signal,
          });
          statusCode = res.status;
          success = res.ok;
        } finally {
          clearTimeout(timeout);
        }
      } catch {
        // Network error, timeout, DNS failure, etc. — statusCode stays
        // null and success stays false; the delivery row still records
        // that an attempt was made.
      }

      await prisma.webhookDelivery.create({
        data: { webhookId: webhook.id, event, payload: payload as Prisma.InputJsonValue, statusCode, success },
      });
    })
  );
}
