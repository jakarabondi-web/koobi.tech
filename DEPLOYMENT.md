# Deployment

Standard Next.js app, deployable to any Node hosting target. No
platform-specific code is required. Vercel is documented in detail below
because it's the shortest path; nothing here locks you to it.

## Deploying to Vercel

### 1. Create a Postgres database first

The app cannot build without one — the build applies migrations. Any managed
Postgres works. **Neon** is the smoothest on Vercel (Storage tab → Create
Database → Neon), but Supabase, Railway, or RDS are all fine.

| Env var | Which string | Why |
| --- | --- | --- |
| `DATABASE_URL` | the **pooled** one (Neon `-pooler`, Supabase port `6543`) | Every serverless invocation can open its own connection. Without a pooler you exhaust the connection limit long before anything else. |
| `DIRECT_URL` | the **direct/unpooled** one — *optional* | Migrations take a session-level advisory lock that a transaction-mode pooler cannot hold. |

**With Vercel's Neon integration you set neither.** Connecting the database
publishes `POSTGRES_PRISMA_URL` and `POSTGRES_URL_NON_POOLING`, and the app
reads those directly (`src/lib/db/connection-url.ts`). They're marked
sensitive in the dashboard, so copying them into hand-made variables isn't
possible anyway.

Set `DATABASE_URL` yourself only on a host that publishes nothing — a VM,
Docker, plain RDS. `DIRECT_URL` likewise: it's used if present, and the build
warns when only a pooled string is available, because migrations take a
session-level advisory lock a transaction-mode pooler cannot hold.

### 2. Import the repo

In Vercel: **Add New → Project**, import `jakarabondi-web/koobi.tech`, and
pick the branch. Framework detection (Next.js) is correct — don't override
the build command; `package.json` already runs migrations before the build.

### 3. Set environment variables

Required — the deploy fails or misbehaves without these:

```
AUTH_SECRET       = <32-byte random value>   # openssl rand -base64 32
```

That is the only variable you must add by hand on Vercel with Neon attached.
The connection strings come from the integration and are picked up
automatically. On any other host, add `DATABASE_URL` too (and `DIRECT_URL` if
the database is pooled).

Strongly recommended once you know the URL:

```
NEXT_PUBLIC_APP_URL = https://your-domain.com
```

If you leave it unset the app now falls back to Vercel's own production URL
rather than `localhost`, so email links still work — but set it explicitly
once you attach a custom domain.

`AUTH_URL` is **not** needed: Auth.js runs with `trustHost: true` and derives
the URL from the request, which is what makes preview deployments work.

Everything else is optional and feature-gated. Left unset, those features
degrade to clearly-labelled mocked behaviour (see `SECURITY.md`) instead of
failing:

- `RESEND_API_KEY` / `EMAIL_FROM` — transactional email. **Unset means no
  email is actually sent**, so nobody can verify their address or reset a
  password. Set this before real users touch the deployment.
- `PERSONA_API_KEY` / `PERSONA_TEMPLATE_ID` — identity verification
- `STRIPE_*`, `MPESA_*` — billing and trainer payouts
- `STORAGE_*` — S3-compatible uploads
- `IPINFO_TOKEN` — IP geolocation for work-location signals
- `SSO_CLIENT_SECRET_<ORG_SLUG>` — per-organization SSO client secret

### 4. Deploy

The build runs `prisma migrate deploy && next build`, so the schema is
created on the first deploy. There is one baseline migration
(`prisma/migrations/0_init`) covering all 67 tables.

### 5. Seed (optional, and think first)

The database starts **empty** — no users, so nothing to sign in with.

Two ways to do it.

**From a machine that can reach the database:**

```bash
DATABASE_URL="<direct connection string>" npm run db:seed
```

**From the deployment itself**, when the database isn't reachable from your
laptop, a temporary route can be added that seeds over HTTP behind a secret.
One was used for this deployment and has since been removed — see commit
history for `src/app/api/admin/seed/route.ts` if you need it again. Delete it
again once used: it creates a super admin whose password is in this repo.

⚠️ The seed creates demo accounts with a **published password**
(`Trainora!Demo2026`), including a super admin. That is correct for a demo
you're showing people and dangerous for anything else — anyone who reads this
repo can sign in as an administrator. For a real environment, skip the seed
and create the first admin directly, or seed and immediately change every
password.

## A note on migrations and previews

The build applies migrations against whatever `DATABASE_URL` it's given. If
you point preview deployments at your production database, a preview branch
will migrate production. Either give previews their own database, or switch
the build command to `build:nomigrate` and run migrations deliberately.

## Other hosts

```bash
npm ci
npm run build     # applies migrations, then builds
npm run start
```

Requirements are just Node 20+, Postgres, and the env vars above.

## Checklist before real users

- [ ] `AUTH_SECRET` is unique to the environment and not committed anywhere
- [ ] `DATABASE_URL` points at managed Postgres **with backups**
- [ ] `RESEND_API_KEY` set — otherwise no one can verify an email or reset a
      password
- [ ] Demo seed data removed, or every seeded password changed
- [ ] `NEXT_PUBLIC_APP_URL` set to the canonical domain
- [ ] Previews are not pointed at the production database
- [ ] Read `SECURITY.md` § "Planned / not yet implemented" — **rate limiting
      is not built**, and `/api/v1` keys are currently unthrottled
- [ ] Export processing and webhook dispatch are not implemented; the UI says
      so, but make sure whoever is using the API knows
