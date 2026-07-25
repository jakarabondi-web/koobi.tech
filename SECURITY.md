# Security

Trainora AI is designed around SOC 2-aligned controls. **We do not hold SOC 2
certification** — marketing copy intentionally says "designed for SOC 2
readiness," never "SOC 2 certified." Do not change that language without
legal/compliance sign-off.

## Implemented

- **Password hashing** — bcrypt (`bcryptjs`, 12 rounds) via `lib/auth`.
- **Server-side authorization** — see `PERMISSIONS.md`. Middleware gates
  surfaces; `can()`/`assertCan()` gates actions; UI conditionals are never
  the only check.
- **Session handling** — JWT sessions (Auth.js v5), 8-hour max age, secure
  cookies in production (Auth.js default), `AUTH_SECRET`-signed.
- **Account lockout** — 5 failed logins locks the account for 15 minutes
  (`User.failedLoginCount` / `lockedUntil`, checked in `lib/auth/index.ts`).
- **Password reset tokens** — single-use, 30-minute expiry
  (`User.passwordResetToken` / `passwordResetExpiresAt`), and the
  forgot-password flow never reveals whether an email is registered.
- **Email verification enforced** — accounts are created `PENDING` and cannot
  sign in until a single-use, 24-hour token is confirmed. The resend endpoint
  always reports success so it can't be used to enumerate registered emails.
- **Consent logging** — `ConsentRecord` written on registration, and again
  (separately) before any biometric identity verification begins.

## Biometric identity verification — privacy boundary

Identity verification runs through a vendor (`src/lib/identity/`), and the
platform stores **decisions only**: pass/fail per check, a provider reference
id, the document's country, and a match score. It never stores document
images, selfies, face embeddings, or biometric templates. Those remain inside
the vendor's compliance envelope.

This is deliberate and load-bearing. Biometric identifiers are special
category data under GDPR Art. 9, and Illinois BIPA attaches statutory damages
per violation with no proof of harm required. Persisting templates here would
pull the platform into obligations it is not built to carry.

**Do not add image, template, or embedding columns to
`IdentityVerification`.** If a future feature seems to need them, that is a
signal to push the work to the vendor instead.

Additional requirements when going live:

- Choose a vendor certified for **iBeta / ISO 30107-3 Level 2** presentation-
  attack detection — passive-only liveness is defeatable by replay and
  camera-injection attacks.
- Collect explicit, separately-recorded consent before capture (implemented:
  `startVerification` writes a `biometric_identity_verification` consent row).
- Publish a retention schedule, and offer a non-biometric fallback for users
  who decline or are in jurisdictions where collection isn't lawful.
- Run a DPIA before processing EU subjects.

A duplicate-identity (1:N) hit raises a `RiskFlag` for human review — it never
auto-bans, consistent with the platform's rule that serious enforcement
requires a person.

## Work location — privacy boundary

Location handling (`src/lib/security/geolocation.ts`,
`src/server/services/work-location.ts`) is deliberately **coarse and
event-driven**, not continuous tracking:

- Country/region/city from IP only — no GPS, no device location.
- Raw IPs are never persisted; only a keyed hash, so repeat visits can be
  correlated without retaining the address.
- Signals are recorded on sign-in and submission, not on a timer.
- Enforcement is **per project** (`ProjectJurisdictionRule`) — "this project
  requires workers in X" — rather than per person.
- Failing a jurisdiction check blocks assignment and is reviewable; it does
  not penalise the user, because corporate VPNs and legitimate travel both
  trip these rules.

Continuous location monitoring of remote knowledge workers would likely fail
GDPR's necessity and proportionality tests, and catches little that the
signals above miss. Raising precision is a decision that needs legal review,
not just a code change.
- **Multi-tenant isolation** — client data is scoped to `Organization`; see
  `PERMISSIONS.md` for the enforcement point.
- **Input validation** — Zod schemas on every server action/form boundary.

## Explicitly mocked (do not mistake for production-ready)

- **Email** (`lib/email/client.ts`) — logs to console and returns
  `{ mocked: true }` when `RESEND_API_KEY` is unset. Real sending requires a
  configured Resend key.
- **File storage, payments (Stripe/Stripe Connect/Wise/PayPal), Redis/queue
  jobs, SSO** — abstraction points exist in `.env.example` and the planned
  `lib/storage` / `lib/payments` modules but are not yet implemented.
- **Two-factor authentication** — `User.twoFactorEnabled` exists as a schema
  field; no TOTP/enrollment flow is built yet.
- **Identity verification** (`src/lib/identity/persona.ts`) — simulates
  document/liveness/face-match/dedupe decisions unless `PERSONA_API_KEY` and
  `PERSONA_TEMPLATE_ID` are set, so the review workflow can be exercised end
  to end without a vendor account.
- **IP geolocation** (`src/lib/security/geolocation.ts`) — returns empty
  results unless `IPINFO_TOKEN` is set.

## Planned / not yet implemented

- CSRF protection beyond Auth.js's built-in CSRF token handling for its own
  endpoints (custom mutating routes should add explicit protection as they're
  built).
- Rate limiting (`RATE_LIMIT_ENABLED` env var is a placeholder — no limiter is
  wired in yet).
- Field-level encryption for sensitive PII beyond password hashing
  (`FIELD_ENCRYPTION_KEY` is reserved in `.env.example`).
- Signed/expiring download URLs for `FileAsset`.
- Full audit-log coverage (the `AuditLog` model exists; write call sites are
  added incrementally as admin actions are built).
- Suspicious-login and anomaly detection (`RiskFlag` model exists; detection
  logic is not yet implemented).

## Reporting

This is a development-stage project. Do not use seeded demo credentials or
this configuration as-is in production — see `.env.example` and `DEPLOYMENT.md`.
