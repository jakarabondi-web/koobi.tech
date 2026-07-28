/**
 * A rough, dependency-free device/browser label for a User-Agent string —
 * good enough for "which of these logins is mine," not a real UA parser.
 */
export function describeUserAgent(userAgent: string | null): string {
  if (!userAgent) return "Unknown device";

  const ua = userAgent;
  let os = "Unknown OS";
  if (/iPhone|iPad/.test(ua)) os = "iOS";
  else if (/Android/.test(ua)) os = "Android";
  else if (/Mac OS X/.test(ua)) os = "macOS";
  else if (/Windows/.test(ua)) os = "Windows";
  else if (/Linux/.test(ua)) os = "Linux";

  let browser = "Unknown browser";
  if (/Edg\//.test(ua)) browser = "Edge";
  else if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) browser = "Chrome";
  else if (/Firefox\//.test(ua)) browser = "Firefox";
  else if (/Safari\//.test(ua) && !/Chrome/.test(ua)) browser = "Safari";

  return `${browser} on ${os}`;
}
