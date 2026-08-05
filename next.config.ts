import type { NextConfig } from "next";

/**
 * Content-Security-Policy.
 *
 * Deliberately pragmatic rather than nonce-strict: the app ships inline
 * scripts it does not control the timing of (next-themes' no-flash theme
 * setter, the JSON-LD block in the root layout) and inline styles
 * throughout, so `script-src`/`style-src` allow `'unsafe-inline'`. That
 * means the CSP is not the primary XSS defense here — React's escaping is —
 * but the directives that *don't* need a nonce still carry real weight:
 * `frame-ancestors 'none'` blocks clickjacking, `object-src 'none'` kills
 * plugin/embed vectors, `base-uri 'self'` stops base-tag hijacking, and
 * `form-action 'self'` keeps form posts on-origin. A nonce-based tightening
 * of `script-src` is a sensible follow-up, but it needs middleware wiring
 * and per-page verification, so it is intentionally not bundled here.
 *
 * `img-src` allows https: so Google OAuth avatars (googleusercontent.com)
 * and the data:/blob: URIs the canvas backgrounds and OG mark produce all
 * load; `connect-src 'self'` because the client makes no cross-origin
 * fetches (fonts are self-hosted via next/font).
 */
const csp = [
  "default-src 'self'",
  "script-src 'self' 'unsafe-inline'",
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob: https:",
  "font-src 'self'",
  "connect-src 'self'",
  "frame-ancestors 'none'",
  "form-action 'self'",
  "base-uri 'self'",
  "object-src 'none'",
  "upgrade-insecure-requests",
].join("; ");

const securityHeaders = [
  { key: "Content-Security-Policy", value: csp },
  // Force HTTPS for two years including subdomains. No `preload` yet — that
  // is a hard-to-reverse commitment to submit to the browser preload list,
  // and worth doing deliberately once the domain setup is settled.
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
  // Redundant with frame-ancestors above for modern browsers, kept for
  // older ones that ignore CSP framing.
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // No page in the app uses camera/microphone/geolocation/FLoC, so deny the
  // whole set rather than enumerating.
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "X-DNS-Prefetch-Control", value: "on" },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
