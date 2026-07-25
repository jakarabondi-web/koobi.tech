# Roadmap

Status snapshot of the phases described in the product spec. This file
should be updated at the end of each implementation phase.

## Phase 1 — Foundation ✅

- Next.js/TypeScript/Tailwind v4 project, hand-built shadcn-style component
  library (shadcn's registry wasn't reachable from this environment)
- Design tokens (brand palette, light/dark themes) in `globals.css`
- Prisma schema covering identity/RBAC, organizations, trainer profile,
  assessments, projects/tasks, review/quality, datasets/exports,
  payments/billing, support/disputes, notifications/compliance
- Auth.js v5 credentials auth, JWT sessions with roles, edge-safe middleware
  gating `/trainer`, `/client`, `/admin` by surface
- Route groups: `(marketing)`, `(auth)`, `trainer`, `client`, `admin`
- Seed script with realistic fictional org/project/task/review/earning data
  and the four demo accounts

## Phase 2 — Marketing & authentication ✅

- Homepage, For AI companies, For experts, Services, Security, Pricing,
  Resources, About, Contact (working form → mocked email), Apply, legal
  stubs (Privacy/Terms/Cookies)
- Login, Register (role-aware), Forgot password, Reset password — all wired
  to real server actions and the Postgres-backed `User` model
- 403 page for cross-surface access attempts

## Phase 3 — Trainer platform 🚧 in progress

Done: dashboard shell (sidebar nav, mobile drawer, sign-out), trainer
dashboard page with real KPI data (active assignments, tasks due, pending
earnings, quality score, notifications) sourced from Prisma.

Not yet built: onboarding wizard, project marketplace + detail pages, task
workspace (the various task-type renderers), assessments UI, quality
dashboard, earnings/payments pages, notifications center, support, profile,
settings.

## Phase 4 — Client platform ⏳ not started

Dashboard, project creation wizard, project overview/tasks/quality/exports,
team management, billing. `ClientProfile`/`Organization` models exist;
onboarding UI does not yet.

## Phase 5 — Admin platform ⏳ not started

Operations dashboard, trainer applications/detail, client list, project
operations, task/quality review, payments, disputes, support, fraud alerts.

## Phase 6 — Enterprise & integrations ⏳ not started

API keys, webhooks, SSO architecture, advanced exports, full audit-log
coverage, real payment-provider integrations, object storage integration.

## Cross-cutting, not yet done

- Automated test suite (Vitest unit tests, Playwright E2E) — infrastructure
  installed, no tests committed yet
- Rate limiting, field-level encryption, signed download URLs (tracked in
  `SECURITY.md`)
- Repository layer (`server/repositories`) for shared/testable query logic
