import { prisma } from "@/lib/db/prisma";
import { encryptField } from "@/lib/security/field-encryption";

/**
 * Best-effort client IP from standard proxy headers. This deployment sits
 * behind a proxy (see AGENTS.md's egress notes), so the connecting socket's
 * address is never the real client address — only forwarded headers are.
 */
function clientIp(hdrs: Headers | undefined): string | null {
  const forwarded = hdrs?.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return hdrs?.get("x-real-ip") ?? null;
}

/**
 * Records a successful sign-in: updates the account's lockout counters and
 * `lastLoginAt`/`lastLoginIp`, and appends a `LoginEvent` row so the user can
 * see recent sign-in activity from their settings page.
 *
 * Called from every Credentials provider's `authorize()` on success (three
 * entry points — password, SSO ticket, 2FA challenge) and from the OAuth
 * `signIn` callback, each a legitimate new sign-in worth logging. Takes a
 * plain `Headers` rather than a `Request` since not every caller has a real
 * Request object to hand — the OAuth callback only has next/headers().
 */
export async function recordSuccessfulLogin(userId: string, hdrs: Headers | undefined) {
  const ipAddress = clientIp(hdrs);
  // Encrypted at rest, same as a payout phone number — an IP tied to a login
  // history is exactly the kind of column worth it (see field-encryption.ts).
  const encryptedIp = ipAddress ? encryptField(ipAddress) : null;
  const userAgent = hdrs?.get("user-agent") ?? null;

  await Promise.all([
    prisma.user.update({
      where: { id: userId },
      data: { failedLoginCount: 0, lockedUntil: null, lastLoginAt: new Date(), lastLoginIp: encryptedIp },
    }),
    prisma.loginEvent.create({ data: { userId, ipAddress: encryptedIp, userAgent } }),
  ]);
}
