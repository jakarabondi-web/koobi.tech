import { describe, expect, it } from "vitest";
import Google from "next-auth/providers/google";

import {
  FEDERATED_ACCOUNT_TYPES,
  isSupportedOAuthAccount,
} from "@/lib/auth/oauth-providers";

describe("federated account matching", () => {
  /**
   * The regression this file exists for. Google is registered as an OIDC
   * provider, so a `account.type === "oauth"` check skipped it entirely —
   * and skipped it silently, because `signIn` returning true still mints a
   * session. Sign-in appeared to work, logged no error, and created no
   * account. Asserting against the real provider means an upstream change
   * to its type fails here rather than in production.
   */
  it("matches the account type Auth.js actually reports for Google", () => {
    const provider = Google({});
    expect(FEDERATED_ACCOUNT_TYPES).toContain(provider.type);
    expect(
      isSupportedOAuthAccount({ type: provider.type, provider: "google" })
    ).toBe(true);
  });

  it("accepts both oauth and oidc account types", () => {
    expect(isSupportedOAuthAccount({ type: "oidc", provider: "google" })).toBe(true);
    expect(isSupportedOAuthAccount({ type: "oauth", provider: "google" })).toBe(true);
  });

  it("ignores the credentials providers, which resolve themselves", () => {
    expect(isSupportedOAuthAccount({ type: "credentials", provider: "credentials" })).toBe(false);
    expect(isSupportedOAuthAccount({ type: "credentials", provider: "sso-ticket" })).toBe(false);
    expect(isSupportedOAuthAccount({ type: "credentials", provider: "two-factor-ticket" })).toBe(false);
  });

  it("ignores a federated provider this app has no account rules for", () => {
    expect(isSupportedOAuthAccount({ type: "oidc", provider: "linkedin" })).toBe(false);
  });

  it("handles a missing or partial account without throwing", () => {
    expect(isSupportedOAuthAccount(null)).toBe(false);
    expect(isSupportedOAuthAccount(undefined)).toBe(false);
    expect(isSupportedOAuthAccount({})).toBe(false);
    expect(isSupportedOAuthAccount({ type: "oidc" })).toBe(false);
    expect(isSupportedOAuthAccount({ provider: "google" })).toBe(false);
  });
});
