import { describe, expect, it } from "vitest";

import { describeUserAgent } from "@/lib/utils/user-agent";

describe("describeUserAgent", () => {
  it("returns a placeholder for a missing user agent", () => {
    expect(describeUserAgent(null)).toBe("Unknown device");
  });

  it("identifies Chrome on macOS", () => {
    const ua =
      "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
    expect(describeUserAgent(ua)).toBe("Chrome on macOS");
  });

  it("identifies Safari on iOS", () => {
    const ua =
      "Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1";
    expect(describeUserAgent(ua)).toBe("Safari on iOS");
  });

  it("identifies Firefox on Windows", () => {
    const ua = "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:121.0) Gecko/20100101 Firefox/121.0";
    expect(describeUserAgent(ua)).toBe("Firefox on Windows");
  });

  it("identifies Edge on Windows distinctly from Chrome", () => {
    const ua =
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36 Edg/120.0.0.0";
    expect(describeUserAgent(ua)).toBe("Edge on Windows");
  });
});
