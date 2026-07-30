import { createHmac } from "node:crypto";

import { beforeEach, describe, expect, it, vi } from "vitest";

/**
 * Outbound webhook delivery has no retry queue behind it (see the comment in
 * webhooks.ts), so the two guarantees that actually hold — every attempt is
 * recorded, and a broken client endpoint never throws back into the request
 * that triggered the event — are exactly what these tests pin down.
 */

const findManyWebhook = vi.fn();
const createDelivery = vi.fn();

vi.mock("@/lib/db/prisma", () => ({
  prisma: {
    webhook: { findMany: (...a: unknown[]) => findManyWebhook(...a) },
    webhookDelivery: { create: (...a: unknown[]) => createDelivery(...a) },
  },
}));

const { dispatchWebhookEvent } = await import("@/server/services/webhooks");

const WEBHOOK = { id: "wh-1", url: "https://client.example/hook", secret: "shh", isActive: true };

beforeEach(() => {
  vi.clearAllMocks();
  vi.stubGlobal("fetch", vi.fn());
});

describe("dispatchWebhookEvent", () => {
  it("does nothing when the organization has no matching active webhook", async () => {
    findManyWebhook.mockResolvedValue([]);

    await dispatchWebhookEvent("org-1", "task.reviewed", { task_id: "t1" });

    expect(fetch).not.toHaveBeenCalled();
    expect(createDelivery).not.toHaveBeenCalled();
  });

  it("only queries webhooks subscribed to the event, active, for that org", async () => {
    findManyWebhook.mockResolvedValue([]);

    await dispatchWebhookEvent("org-1", "export.ready", { export_id: "e1" });

    expect(findManyWebhook).toHaveBeenCalledWith({
      where: { organizationId: "org-1", isActive: true, events: { has: "export.ready" } },
    });
  });

  it("signs the body with HMAC-SHA256 using the webhook's secret", async () => {
    findManyWebhook.mockResolvedValue([WEBHOOK]);
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, status: 200 });

    await dispatchWebhookEvent("org-1", "task.reviewed", { task_id: "t1" });

    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(url).toBe(WEBHOOK.url);
    const body = init.body as string;
    const expectedSignature = createHmac("sha256", WEBHOOK.secret).update(body).digest("hex");
    expect(init.headers["x-traivr-signature"]).toBe(expectedSignature);
    expect(init.headers["x-traivr-event"]).toBe("task.reviewed");
    expect(JSON.parse(body)).toMatchObject({ event: "task.reviewed", data: { task_id: "t1" } });
  });

  it("records a successful delivery", async () => {
    findManyWebhook.mockResolvedValue([WEBHOOK]);
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, status: 200 });

    await dispatchWebhookEvent("org-1", "task.reviewed", { task_id: "t1" });

    expect(createDelivery).toHaveBeenCalledWith({
      data: {
        webhookId: WEBHOOK.id,
        event: "task.reviewed",
        payload: { task_id: "t1" },
        statusCode: 200,
        success: true,
      },
    });
  });

  it("records a failed delivery when the endpoint returns a non-2xx status, without throwing", async () => {
    findManyWebhook.mockResolvedValue([WEBHOOK]);
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: false, status: 500 });

    await expect(dispatchWebhookEvent("org-1", "task.reviewed", {})).resolves.toBeUndefined();

    expect(createDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ statusCode: 500, success: false }) })
    );
  });

  it("records a failed delivery with a null status code when the fetch itself throws, without propagating", async () => {
    findManyWebhook.mockResolvedValue([WEBHOOK]);
    (fetch as ReturnType<typeof vi.fn>).mockRejectedValue(new Error("network error"));

    await expect(dispatchWebhookEvent("org-1", "task.reviewed", {})).resolves.toBeUndefined();

    expect(createDelivery).toHaveBeenCalledWith(
      expect.objectContaining({ data: expect.objectContaining({ statusCode: null, success: false }) })
    );
  });

  it("delivers to every matching webhook independently", async () => {
    const second = { ...WEBHOOK, id: "wh-2", url: "https://other.example/hook" };
    findManyWebhook.mockResolvedValue([WEBHOOK, second]);
    (fetch as ReturnType<typeof vi.fn>).mockResolvedValue({ ok: true, status: 200 });

    await dispatchWebhookEvent("org-1", "task.reviewed", {});

    expect(fetch).toHaveBeenCalledTimes(2);
    expect(createDelivery).toHaveBeenCalledTimes(2);
  });
});
