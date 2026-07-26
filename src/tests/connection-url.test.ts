import { describe, expect, it } from "vitest";

import {
  databaseUrlSource,
  directUrlSource,
  resolveDatabaseUrl,
  resolveDirectUrl,
} from "@/lib/db/connection-url";

const env = (o: Record<string, string>) => o as NodeJS.ProcessEnv;

describe("resolveDatabaseUrl", () => {
  it("prefers DATABASE_URL when it is set", () => {
    const e = env({ DATABASE_URL: "mine", POSTGRES_PRISMA_URL: "theirs" });
    expect(resolveDatabaseUrl(e)).toBe("mine");
  });

  it("falls back to POSTGRES_PRISMA_URL", () => {
    // What Vercel's Neon integration actually creates. It marks the value
    // sensitive, so it cannot be copied into a DATABASE_URL by hand.
    expect(resolveDatabaseUrl(env({ POSTGRES_PRISMA_URL: "neon" }))).toBe("neon");
  });

  it("prefers POSTGRES_PRISMA_URL over POSTGRES_URL", () => {
    // The Prisma-specific one already carries pgbouncer=true and a timeout.
    const e = env({ POSTGRES_URL: "plain", POSTGRES_PRISMA_URL: "prisma" });
    expect(resolveDatabaseUrl(e)).toBe("prisma");
  });

  it("returns undefined when nothing is set", () => {
    expect(resolveDatabaseUrl(env({}))).toBeUndefined();
  });

  it("skips an empty or whitespace value instead of using it", () => {
    const e = env({ DATABASE_URL: "   ", POSTGRES_PRISMA_URL: "real" });
    expect(resolveDatabaseUrl(e)).toBe("real");
  });
});

describe("resolveDirectUrl", () => {
  it("prefers DIRECT_URL", () => {
    const e = env({ DIRECT_URL: "direct", POSTGRES_URL_NON_POOLING: "neon" });
    expect(resolveDirectUrl(e)).toBe("direct");
  });

  it("falls back to the Neon unpooled names", () => {
    expect(resolveDirectUrl(env({ POSTGRES_URL_NON_POOLING: "neon" }))).toBe("neon");
    expect(resolveDirectUrl(env({ DATABASE_URL_UNPOOLED: "unpooled" }))).toBe("unpooled");
  });

  it("falls back to the pooled URL when no direct one exists", () => {
    // Correct for a database with no pooler; the migration script warns
    // because an advisory lock can still fail through one.
    expect(resolveDirectUrl(env({ POSTGRES_PRISMA_URL: "pooled" }))).toBe("pooled");
  });

  it("returns undefined when there is no database at all", () => {
    expect(resolveDirectUrl(env({}))).toBeUndefined();
  });
});

describe("source reporting", () => {
  it("names the variable a value came from, for honest log lines", () => {
    expect(databaseUrlSource(env({ POSTGRES_PRISMA_URL: "x" }))).toBe("POSTGRES_PRISMA_URL");
    expect(directUrlSource(env({ POSTGRES_URL_NON_POOLING: "x" }))).toBe("POSTGRES_URL_NON_POOLING");
  });

  it("reports nothing when nothing is set", () => {
    expect(databaseUrlSource(env({}))).toBeUndefined();
    expect(directUrlSource(env({}))).toBeUndefined();
  });
});
