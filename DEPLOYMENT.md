# Deployment

## Overview

Standard Next.js app, deployable to any Node hosting target (Vercel,
containers/Docker, etc.). No platform-specific code is required.

## Required infrastructure

- **PostgreSQL** — set `DATABASE_URL`. Run `prisma migrate deploy` (not
  `db push`) as part of the deploy pipeline once migrations exist.
- **`AUTH_SECRET`** — a strong random value, different per environment.
  **`AUTH_URL`** — the deployment's canonical URL (used by Auth.js callback
  handling).

## Optional infrastructure (feature-gated)

These are safe to leave unset — the corresponding features degrade to mocked
behavior (see `SECURITY.md`) rather than failing hard:

- `RESEND_API_KEY` / `EMAIL_FROM` — transactional email
- `STORAGE_*` — S3-compatible object storage for uploads (resumes, evidence)
- `REDIS_URL` — queues/rate limiting/session cache (not yet wired in)
- `STRIPE_*` — client billing
- `STRIPE_CONNECT_CLIENT_ID` / `WISE_API_KEY` / `PAYPAL_*` — trainer payouts

## Build

```bash
npm run build
npm run start
```

## Environment checklist before a real deploy

- [ ] Rotate `AUTH_SECRET` and `FIELD_ENCRYPTION_KEY` per environment
- [ ] Point `DATABASE_URL` at a managed PostgreSQL instance with backups
- [ ] Do not seed demo accounts (`npm run db:seed`) in production
- [ ] Configure real email/payment providers or explicitly accept the mocked
      behavior for that environment
- [ ] Review `SECURITY.md` "planned" section — rate limiting and field
      encryption are not yet implemented
