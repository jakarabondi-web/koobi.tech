import crypto from "node:crypto";

/**
 * Coarse IP geolocation + VPN/proxy detection.
 *
 * DESIGN NOTE: this is deliberately country/region-level, not GPS. The goal
 * is to enforce per-project jurisdiction rules and detect account sharing —
 * not to monitor individuals. Raw IPs are never persisted; only a salted
 * hash is stored so repeat visits can be correlated without retaining the
 * address itself. See SECURITY.md before increasing precision.
 *
 * MOCKED unless IPINFO_TOKEN is set.
 */

export type GeoLookup = {
  countryCode?: string;
  region?: string;
  city?: string;
  isVpn: boolean;
  isProxy: boolean;
  isDatacenter: boolean;
  mocked: boolean;
};

export function hashIp(ip: string): string {
  const salt = process.env.FIELD_ENCRYPTION_KEY ?? "dev-salt";
  return crypto.createHmac("sha256", salt).update(ip).digest("hex").slice(0, 32);
}

export async function lookupIp(ip: string): Promise<GeoLookup> {
  const token = process.env.IPINFO_TOKEN;

  if (!token) {
    console.warn(`[geo:mock] No IPINFO_TOKEN — returning empty geolocation for ${hashIp(ip)}`);
    return { isVpn: false, isProxy: false, isDatacenter: false, mocked: true };
  }

  const res = await fetch(`https://ipinfo.io/${ip}?token=${token}`, {
    // Geolocation for a given IP is stable enough to cache for a day.
    next: { revalidate: 86_400 },
  });
  if (!res.ok) {
    return { isVpn: false, isProxy: false, isDatacenter: false, mocked: false };
  }

  const json = (await res.json()) as {
    country?: string;
    region?: string;
    city?: string;
    privacy?: { vpn?: boolean; proxy?: boolean; hosting?: boolean };
  };

  return {
    countryCode: json.country,
    region: json.region,
    city: json.city,
    isVpn: json.privacy?.vpn ?? false,
    isProxy: json.privacy?.proxy ?? false,
    isDatacenter: json.privacy?.hosting ?? false,
    mocked: false,
  };
}

/** Extracts the client IP from proxy headers, preferring the leftmost hop. */
export function clientIpFromHeaders(headers: Headers): string | null {
  const forwarded = headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0]?.trim() ?? null;
  return headers.get("x-real-ip");
}
