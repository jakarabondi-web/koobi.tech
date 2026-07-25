import { describe, expect, it } from "vitest";

import {
  enumFilter,
  isFailure,
  pagination,
  PROJECT_STATUSES,
  readJson,
  REVIEW_DECISIONS,
  TASK_STATUSES,
} from "@/server/services/api-auth";

const url = (qs: string) => new URL(`https://x.test/api/v1/projects${qs}`);

describe("pagination", () => {
  it("applies defaults when nothing is asked for", () => {
    expect(pagination(url(""))).toEqual({ limit: 50, offset: 0 });
  });

  it("clamps an oversized limit rather than honouring it", () => {
    // Otherwise one request can ask for the whole table.
    expect(pagination(url("?limit=100000")).limit).toBe(200);
  });

  it("ignores junk, zero, and negative values", () => {
    for (const qs of ["?limit=abc", "?limit=0", "?limit=-5"]) {
      expect(pagination(url(qs)).limit, qs).toBe(50);
    }
    expect(pagination(url("?offset=-10")).offset).toBe(0);
  });

  it("floors fractional input", () => {
    expect(pagination(url("?limit=10.9&offset=5.7"))).toEqual({ limit: 10, offset: 5 });
  });
});

describe("enumFilter", () => {
  it("passes an absent filter through as undefined", () => {
    const result = enumFilter(null, PROJECT_STATUSES, "status");
    expect(isFailure(result)).toBe(false);
    if (!isFailure(result)) expect(result.value).toBeUndefined();
  });

  it("accepts a valid value case-insensitively", () => {
    const result = enumFilter("active", PROJECT_STATUSES, "status");
    if (!isFailure(result)) expect(result.value).toBe("ACTIVE");
  });

  it("rejects an unknown value with 400, not a database error", () => {
    // Passing this to Prisma as an enum produced a bare 500 and told the
    // caller nothing about their typo.
    const result = enumFilter("bogus", TASK_STATUSES, "status");
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) expect(result.response.status).toBe(400);
  });

  it("names the accepted values in the error", async () => {
    const result = enumFilter("nope", REVIEW_DECISIONS, "decision");
    if (isFailure(result)) {
      const body = await result.response.json();
      expect(body.error.message).toContain("APPROVED");
      expect(body.error.message).toContain("decision");
    }
  });

  it("treats an empty string as no filter", () => {
    const result = enumFilter("", PROJECT_STATUSES, "status");
    if (!isFailure(result)) expect(result.value).toBeUndefined();
  });
});

describe("readJson", () => {
  const post = (body: string, headers: Record<string, string> = {}) =>
    new Request("https://x.test/api/v1/tasks", {
      method: "POST",
      headers: { "content-type": "application/json", ...headers },
      body,
    });

  it("parses a valid body", async () => {
    const result = await readJson(post(JSON.stringify({ a: 1 })));
    expect(isFailure(result)).toBe(false);
    if (!isFailure(result)) expect(result.data).toEqual({ a: 1 });
  });

  it("returns 400 for malformed JSON", async () => {
    const result = await readJson(post("{not json"));
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) expect(result.response.status).toBe(400);
  });

  it("rejects an oversized body declared honestly", async () => {
    const big = JSON.stringify({ pad: "x".repeat(2_100_000) });
    const result = await readJson(post(big));
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) expect(result.response.status).toBe(413);
  });

  it("rejects an oversized body that omits content-length", async () => {
    // The cap has to be measured. content-length is caller-supplied and is
    // simply absent on a chunked request, so a header check alone was
    // skippable by anyone who wanted to skip it.
    const big = JSON.stringify({ pad: "x".repeat(2_100_000) });
    const stream = new ReadableStream({
      start(controller) {
        const bytes = new TextEncoder().encode(big);
        for (let i = 0; i < bytes.length; i += 65536) {
          controller.enqueue(bytes.slice(i, i + 65536));
        }
        controller.close();
      },
    });

    const request = new Request("https://x.test/api/v1/tasks", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: stream,
      // @ts-expect-error -- required by undici for a streaming body
      duplex: "half",
    });

    expect(request.headers.get("content-length")).toBeNull();

    const result = await readJson(request);
    expect(isFailure(result)).toBe(true);
    if (isFailure(result)) expect(result.response.status).toBe(413);
  });

  it("accepts a body just under the limit", async () => {
    const ok = JSON.stringify({ pad: "x".repeat(1_900_000) });
    const result = await readJson(post(ok));
    expect(isFailure(result)).toBe(false);
  });
});
