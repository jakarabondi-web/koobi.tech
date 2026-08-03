import { prisma } from "@/lib/db/prisma";
import { describeUserAgent } from "@/lib/utils/user-agent";
import { decryptFieldOrLegacy } from "@/lib/security/field-encryption";
import type { LoginEventSummary } from "@/components/shared/sessions-panel";

const RECENT_LOGIN_LIMIT = 8;

export async function recentLoginSummaries(userId: string): Promise<LoginEventSummary[]> {
  const events = await prisma.loginEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: RECENT_LOGIN_LIMIT,
  });

  return events.map((event, i) => ({
    id: event.id,
    device: describeUserAgent(event.userAgent),
    ipAddress: event.ipAddress ? decryptFieldOrLegacy(event.ipAddress) : null,
    createdAt: event.createdAt.toISOString(),
    isMostRecent: i === 0,
  }));
}
