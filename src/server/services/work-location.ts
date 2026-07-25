import { prisma } from "@/lib/db/prisma";
import { hashIp, lookupIp } from "@/lib/security/geolocation";

/**
 * Records a coarse location observation for a user.
 * Called on sign-in and on task submission — not continuously.
 */
export async function recordLocationSignal(params: { userId: string; ip: string }) {
  const geo = await lookupIp(params.ip);

  await prisma.locationSignal.create({
    data: {
      userId: params.userId,
      source: "IP_GEOLOCATION",
      countryCode: geo.countryCode,
      region: geo.region,
      city: geo.city,
      ipHash: hashIp(params.ip),
      isVpn: geo.isVpn,
      isProxy: geo.isProxy,
      isDatacenter: geo.isDatacenter,
    },
  });

  return geo;
}

export type EligibilityResult = {
  eligible: boolean;
  reasons: string[];
};

/**
 * Checks whether a user may work on a project, given the project's
 * jurisdiction rules and the user's most recent location signal.
 *
 * A failure here blocks assignment but never auto-penalises the user —
 * legitimate travel and corporate VPNs both trip these rules, so the
 * outcome is "not eligible right now", reviewable by an operations manager.
 */
export async function checkProjectEligibility(params: {
  userId: string;
  projectId: string;
}): Promise<EligibilityResult> {
  const [rules, latest, identity] = await Promise.all([
    prisma.projectJurisdictionRule.findMany({ where: { projectId: params.projectId } }),
    prisma.locationSignal.findFirst({
      where: { userId: params.userId },
      orderBy: { observedAt: "desc" },
    }),
    prisma.identityVerification.findUnique({ where: { userId: params.userId } }),
  ]);

  if (rules.length === 0) return { eligible: true, reasons: [] };

  const reasons: string[] = [];
  const country = latest?.countryCode ?? identity?.documentCountry ?? null;

  const allow = rules.filter((r) => r.mode === "ALLOW").map((r) => r.countryCode);
  const block = rules.filter((r) => r.mode === "BLOCK").map((r) => r.countryCode);

  if (!country) {
    reasons.push("No verified work location on file for this account.");
  } else {
    if (allow.length > 0 && !allow.includes(country)) {
      reasons.push(`This project is limited to: ${allow.join(", ")}.`);
    }
    if (block.includes(country)) {
      reasons.push("This project isn't available in your current location.");
    }
  }

  if (rules.some((r) => r.blockVpn) && latest) {
    if (latest.isVpn || latest.isProxy || latest.isDatacenter) {
      reasons.push("Connect without a VPN or proxy to work on this project.");
    }
  }

  return { eligible: reasons.length === 0, reasons };
}

/**
 * Flags physically implausible movement between consecutive sign-ins — a
 * strong shared-account signal. Raises a RiskFlag for human review rather
 * than taking any automatic action.
 */
export async function detectImpossibleTravel(userId: string) {
  const recent = await prisma.locationSignal.findMany({
    where: { userId },
    orderBy: { observedAt: "desc" },
    take: 2,
  });
  if (recent.length < 2) return null;

  const [latest, previous] = recent;
  if (!latest.countryCode || !previous.countryCode) return null;
  if (latest.countryCode === previous.countryCode) return null;

  const hoursApart = (latest.observedAt.getTime() - previous.observedAt.getTime()) / 3_600_000;
  // Under ~2h between different countries is faster than realistic travel
  // for most pairs, and is far more likely to be a shared credential.
  if (hoursApart > 2) return null;

  return prisma.riskFlag.create({
    data: {
      userId,
      signal: "impossible_travel",
      severity: "medium",
      details: {
        from: previous.countryCode,
        to: latest.countryCode,
        hoursApart: Math.round(hoursApart * 10) / 10,
      },
    },
  });
}
