/**
 * Which `account` objects from Auth.js represent a federated sign-in this
 * app resolves to a local user.
 *
 * The subtlety worth spelling out: Auth.js reports Google as an **OIDC**
 * provider (`type: "oidc"`), not a plain OAuth 2 one. A callback that checks
 * `account.type === "oauth"` therefore skips Google entirely — and skips it
 * *silently*, because returning "allowed" from `signIn` still mints a
 * session. The result is a sign-in that looks successful, logs no error,
 * and leaves no linked account or roles behind. Match both types.
 */
export const FEDERATED_ACCOUNT_TYPES = ["oauth", "oidc"] as const;

/** Providers `resolveOAuthSignIn` knows how to turn into a local account. */
export const SUPPORTED_OAUTH_PROVIDERS = ["google"] as const;

export type SupportedOAuthProvider = (typeof SUPPORTED_OAUTH_PROVIDERS)[number];

export function isSupportedOAuthAccount(
  account: { type?: string | null; provider?: string | null } | null | undefined
): account is { type: string; provider: SupportedOAuthProvider } {
  if (!account?.type || !account.provider) return false;
  return (
    (FEDERATED_ACCOUNT_TYPES as readonly string[]).includes(account.type) &&
    (SUPPORTED_OAUTH_PROVIDERS as readonly string[]).includes(account.provider)
  );
}
