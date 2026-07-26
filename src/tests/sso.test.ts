import { describe, expect, it } from "vitest";

import {
  checkDomainToken,
  createPkcePair,
  domainOfEmail,
  generateDomainToken,
  isPublicEmailDomain,
  isValidDomain,
  normalizeDomain,
} from "@/lib/auth/sso";

describe("normalizeDomain", () => {
  it("strips scheme, path, leading @, and case", () => {
    expect(normalizeDomain("https://Acme.com/sso")).toBe("acme.com");
    expect(normalizeDomain("@ACME.com")).toBe("acme.com");
    expect(normalizeDomain("  acme.com.  ")).toBe("acme.com");
  });
});

describe("isValidDomain", () => {
  it("accepts real domain shapes", () => {
    for (const d of ["acme.com", "sso.acme.co.uk", "a-b.example.org"]) {
      expect(isValidDomain(d), d).toBe(true);
    }
  });

  it("rejects things that aren't domains", () => {
    for (const d of ["acme", "acme.c", "-acme.com", "acme .com", "http://acme.com", ""]) {
      expect(isValidDomain(d), d).toBe(false);
    }
  });
});

describe("isPublicEmailDomain", () => {
  it("blocks shared consumer domains", () => {
    // A tenant that could claim gmail.com would capture sign-ins belonging to
    // everyone who uses it.
    for (const d of ["gmail.com", "Outlook.com", "proton.me", "qq.com"]) {
      expect(isPublicEmailDomain(d), d).toBe(true);
    }
  });

  it("allows a corporate domain", () => {
    expect(isPublicEmailDomain("acme.com")).toBe(false);
  });
});

describe("domainOfEmail", () => {
  it("returns the domain, lowercased", () => {
    expect(domainOfEmail("Person@Acme.COM")).toBe("acme.com");
  });

  it("handles an address containing an @ in the local part", () => {
    expect(domainOfEmail('"odd@name"@acme.com')).toBe("acme.com");
  });

  it("returns null for input that isn't an address", () => {
    expect(domainOfEmail("acme.com")).toBeNull();
    expect(domainOfEmail("person@")).toBeNull();
  });
});

describe("generateDomainToken", () => {
  it("is unguessable and unique", () => {
    const tokens = new Set(Array.from({ length: 200 }, generateDomainToken));
    expect(tokens.size).toBe(200);
    expect(generateDomainToken()).toMatch(/^[0-9a-f]{32}$/);
  });
});

describe("createPkcePair", () => {
  it("derives the challenge from the verifier with S256", async () => {
    const { verifier, challenge } = createPkcePair();
    const { createHash } = await import("node:crypto");
    expect(createHash("sha256").update(verifier).digest("base64url")).toBe(challenge);
  });

  it("uses url-safe characters only", () => {
    const { verifier, challenge } = createPkcePair();
    expect(verifier).toMatch(/^[A-Za-z0-9_-]+$/);
    expect(challenge).toMatch(/^[A-Za-z0-9_-]+$/);
  });

  it("is different every time", () => {
    expect(createPkcePair().verifier).not.toBe(createPkcePair().verifier);
  });
});

describe("checkDomainToken", () => {
  const token = "a".repeat(32);
  const record = `traivr-domain-verification=${token}`;
  const stub = (records: string[][]) => async () => records;

  it("verifies when the exact record is present alongside others", async () => {
    const result = await checkDomainToken(
      "acme.com",
      token,
      stub([["v=spf1 include:_spf.google.com ~all"], [record]])
    );
    expect(result.verified).toBe(true);
  });

  it("verifies a record DNS split into multiple strings", async () => {
    // TXT values over 255 bytes arrive as several chunks; they concatenate.
    const chunks = [record.slice(0, 20), record.slice(20)];
    const result = await checkDomainToken("acme.com", token, stub([chunks]));
    expect(result.verified).toBe(true);
  });

  it("rejects a stale token and says the value is wrong", async () => {
    const result = await checkDomainToken(
      "acme.com",
      token,
      stub([[`traivr-domain-verification=${"b".repeat(32)}`]])
    );
    expect(result.verified).toBe(false);
    if (!result.verified) {
      expect(result.reason).toMatch(/doesn't match/i);
      // The competing record is reported so the fix is obvious.
      expect(result.found).toHaveLength(1);
    }
  });

  it("reports a missing record separately from a wrong one", async () => {
    const result = await checkDomainToken("acme.com", token, stub([["unrelated=1"]]));
    expect(result.verified).toBe(false);
    if (!result.verified) {
      expect(result.reason).toMatch(/wasn't found/i);
      expect(result.found).toEqual([]);
    }
  });

  it("does not verify when the domain has no TXT records at all", async () => {
    const enotfound = async () => {
      throw Object.assign(new Error("nope"), { code: "ENOTFOUND" });
    };
    const result = await checkDomainToken("acme.com", token, enotfound);
    expect(result.verified).toBe(false);
    if (!result.verified) expect(result.reason).toMatch(/No TXT records/i);
  });

  it("treats a lookup failure as unverified rather than passing it", async () => {
    const boom = async () => {
      throw new Error("network down");
    };
    const result = await checkDomainToken("acme.com", token, boom);
    expect(result.verified).toBe(false);
  });
});
