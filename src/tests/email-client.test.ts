import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { isEmailConfigured, sendEmail } from "@/lib/email/client";

/**
 * `mocked` is the flag that decides whether the sign-up screen reveals a
 * verification link. Getting it wrong in the permissive direction would hand
 * out a way to activate an account without proving the address — so it is
 * worth pinning down directly.
 */

const original = process.env.RESEND_API_KEY;
const realFetch = globalThis.fetch;

beforeEach(() => {
  delete process.env.RESEND_API_KEY;
});

afterEach(() => {
  if (original === undefined) delete process.env.RESEND_API_KEY;
  else process.env.RESEND_API_KEY = original;
  globalThis.fetch = realFetch;
  vi.restoreAllMocks();
});

const message = { to: "a@example.com", subject: "Hi", html: "<p>Hi</p>" };

describe("isEmailConfigured", () => {
  it("is false without an API key", () => {
    expect(isEmailConfigured()).toBe(false);
  });

  it("is true with one", () => {
    process.env.RESEND_API_KEY = "re_test_key";
    expect(isEmailConfigured()).toBe(true);
  });
});

describe("sendEmail", () => {
  it("reports mocked and sends nothing when unconfigured", async () => {
    const spy = vi.fn();
    globalThis.fetch = spy as unknown as typeof fetch;
    vi.spyOn(console, "warn").mockImplementation(() => {});

    const result = await sendEmail(message);

    expect(result.mocked).toBe(true);
    expect(spy).not.toHaveBeenCalled();
  });

  it("reports NOT mocked when a real send succeeds", async () => {
    // This is the case that must never expose a verification link.
    process.env.RESEND_API_KEY = "re_test_key";
    globalThis.fetch = (async () =>
      new Response(JSON.stringify({ id: "1" }), { status: 200 })) as unknown as typeof fetch;

    expect((await sendEmail(message)).mocked).toBe(false);
  });

  it("throws rather than silently reporting mocked when the provider rejects", async () => {
    // A failed send must not be mistaken for an unconfigured deployment —
    // that would leak the link on a production site during an outage.
    process.env.RESEND_API_KEY = "re_test_key";
    globalThis.fetch = (async () =>
      new Response("bad key", { status: 401 })) as unknown as typeof fetch;

    await expect(sendEmail(message)).rejects.toThrow(/401/);
  });

  it("sends to the configured from-address", async () => {
    process.env.RESEND_API_KEY = "re_test_key";
    process.env.EMAIL_FROM = "Test <test@example.com>";
    let body: string | undefined;
    globalThis.fetch = (async (_url: unknown, init: RequestInit) => {
      body = init.body as string;
      return new Response("{}", { status: 200 });
    }) as unknown as typeof fetch;

    await sendEmail(message);

    expect(JSON.parse(body!).from).toBe("Test <test@example.com>");
    delete process.env.EMAIL_FROM;
  });
});
