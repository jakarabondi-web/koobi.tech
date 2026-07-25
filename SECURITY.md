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
- **Consent logging** — `ConsentRecord` written on registration.
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
