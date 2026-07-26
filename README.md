# Traivr

> Human expertise for better AI.

Traivr is an AI-training workforce platform connecting verified trainers,
subject-matter experts, and reviewers with AI companies that need human
feedback, model evaluations, RLHF preference data, red teaming, and
supervised fine-tuning data.

This repository contains four connected applications in one codebase:

- **Marketing site** — public pages, sign-up entry points
- **Trainer portal** (`/trainer`) — onboarding, marketplace, task workspace, earnings
- **Client portal** (`/client`) — project creation, quality analytics, billing, exports
- **Admin portal** (`/admin`) — operations, quality, payments, support, fraud

See `ARCHITECTURE.md`, `DATABASE.md`, `PERMISSIONS.md`, and `SECURITY.md` for
deeper documentation. `ROADMAP.md` tracks what's implemented vs. planned.

## Technology stack

- Next.js (App Router) + TypeScript + React
- Tailwind CSS v4 + hand-built shadcn-style component primitives (Radix UI)
- PostgreSQL + Prisma ORM
- Auth.js (NextAuth v5, credentials provider, JWT sessions, RBAC)
- Zod, React Hook Form, TanStack Table/Query, Recharts, Lucide icons
- Vitest, Playwright, ESLint, Prettier

Email (Resend) and payments (Stripe/Stripe Connect/Wise/PayPal) are wired
through small abstraction layers in `src/lib/email` and `src/lib/payments` so
providers can be swapped. Without API keys configured, these log/mock instead
of silently failing — see `SECURITY.md` for what's mocked vs. real.

## Getting started

### 1. Install dependencies

```bash
npm install
```

### 2. Configure environment variables

```bash
cp .env.example .env
```

At minimum, set `DATABASE_URL` to a PostgreSQL connection string and
`AUTH_SECRET` to a random 32-byte value (`openssl rand -base64 32`).

### 3. Set up the database

```bash
npm run db:push      # sync the Prisma schema to your database (dev)
npm run db:seed      # load demo accounts + sample data
```

For schema changes over time, prefer `npm run db:migrate` to generate
migrations instead of `db:push`.

### 4. Run the dev server

```bash
npm run dev
```

Open http://localhost:3000.

## Development commands

| Command              | Description                              |
| --------------------- | ----------------------------------------- |
| `npm run dev`          | Start the dev server                      |
| `npm run build`        | Production build                          |
| `npm run start`        | Run the production build                  |
| `npm run lint`         | ESLint                                    |
| `npm run test`         | Run unit/integration tests (Vitest)       |
| `npm run test:watch`   | Vitest in watch mode                      |
| `npm run db:push`      | Push Prisma schema to the database        |
| `npm run db:migrate`   | Create/apply a Prisma migration           |
| `npm run db:seed`      | Seed demo data                            |
| `npm run db:studio`    | Open Prisma Studio                        |

## Demo accounts (development only)

After running `npm run db:seed`, sign in at `/login` with:

| Email                     | Role         | Password              |
| -------------------------- | ------------ | ---------------------- |
| `trainer@traivr.demo`    | Trainer      | `Traivr!Demo2026`    |
| `reviewer@traivr.demo`   | Reviewer     | `Traivr!Demo2026`    |
| `client@traivr.demo`     | Client Admin | `Traivr!Demo2026`    |
| `admin@traivr.demo`      | Super Admin  | `Traivr!Demo2026`    |

These accounts and password only exist in your local seeded database — never
committed as production credentials.

## Deployment overview

The app is a standard Next.js application and can be deployed to any Node
hosting target (Vercel, containers, etc.). It requires:

- A reachable PostgreSQL database (`DATABASE_URL`)
- `AUTH_SECRET` and `AUTH_URL` set for the deployment domain
- Optional: Resend, Stripe, S3-compatible storage, and Redis credentials for
  the features that depend on them (see `.env.example`)

Run `npm run db:migrate deploy`-style migrations as part of your deploy
pipeline rather than `db:push` in production.

## Project status

This is an actively developed foundation, not a finished product. See
`ROADMAP.md` for what's built vs. planned across the marketing site, trainer
portal, client portal, and admin portal.
