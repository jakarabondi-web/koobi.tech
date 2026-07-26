import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { appUrl } from "@/lib/app-url";

const KEYS = ["NEXT_PUBLIC_APP_URL", "VERCEL_PROJECT_PRODUCTION_URL", "VERCEL_URL"] as const;
let saved: Record<string, string | undefined>;

beforeEach(() => {
  saved = Object.fromEntries(KEYS.map((k) => [k, process.env[k]]));
  for (const k of KEYS) delete process.env[k];
});

afterEach(() => {
  for (const k of KEYS) {
    if (saved[k] === undefined) delete process.env[k];
    else process.env[k] = saved[k];
  }
});

describe("appUrl", () => {
  it("prefers explicit configuration, since a custom domain can't be inferred", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://traivr.com";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "proj.vercel.app";
    expect(appUrl()).toBe("https://traivr.com");
  });

  it("falls back to Vercel's production URL, not localhost", () => {
    // The bug this guards: an unset NEXT_PUBLIC_APP_URL used to put
    // http://localhost:3000 links into real verification emails.
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "traivr.vercel.app";
    expect(appUrl()).toBe("https://traivr.vercel.app");
  });

  it("prefers the stable production URL over the per-deployment one", () => {
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "traivr.vercel.app";
    process.env.VERCEL_URL = "traivr-abc123.vercel.app";
    expect(appUrl()).toBe("https://traivr.vercel.app");
  });

  it("uses the deployment URL when that's all there is", () => {
    process.env.VERCEL_URL = "traivr-abc123.vercel.app";
    expect(appUrl()).toBe("https://traivr-abc123.vercel.app");
  });

  it("falls back to localhost off-platform", () => {
    expect(appUrl()).toBe("http://localhost:3000");
  });

  it("strips trailing slashes so links don't end up with a double slash", () => {
    process.env.NEXT_PUBLIC_APP_URL = "https://traivr.com//";
    expect(appUrl()).toBe("https://traivr.com");
  });

  it("ignores an empty string rather than treating it as configured", () => {
    process.env.NEXT_PUBLIC_APP_URL = "";
    process.env.VERCEL_PROJECT_PRODUCTION_URL = "traivr.vercel.app";
    expect(appUrl()).toBe("https://traivr.vercel.app");
  });
});
