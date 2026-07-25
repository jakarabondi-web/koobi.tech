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

## Phase 3 — Trainer platform ✅

All 17 trainer routes are built and reachable — no dead nav links:
application/onboarding, dashboard, project marketplace + detail, my
projects, task list, gold-task results, pairwise task workspace,
assessments + attempt runner, quality, earnings, wallet/payments, tax
summary, notifications, profile, settings, help center, tickets, and
identity verification.

Task workspace covers pairwise comparison with rubric scoring, confidence,
flags, timing, and localStorage draft recovery. Other task-type renderers
(ranking, prompt writing, code review, …) are not built yet.

## Trust & safety ✅ (verified end to end)

The applicant journey is gated and verified in a browser against Postgres:
sign up → email confirm → application → qualification assessment →
identity verification → **"application under review"** → admin decision →
approval email → marketplace unlocks. Assignments stay blocked at every
step until approved.

Done:
- Email verification is enforced — accounts start `PENDING` and cannot sign
  in until confirmed; resend flow avoids email enumeration
- Identity verification: vendor-abstracted provider contract with a Persona
  implementation, consent recording, attempt limits, duplicate-identity
  risk flags, manual review path. **Decisions only — no biometric storage**
- Work location: coarse IP geolocation, VPN/proxy/datacenter detection,
  hashed IPs, per-project jurisdiction rules, impossible-travel detection
- Agreement metrics: Krippendorff's alpha and majority agreement, unit
  tested against hand-computed values

- Approval gate (`lib/permissions/gating.ts`) — single source of truth for
  whether a trainer may access paid work, enforced server-side
- Assessment engine with timing, attempt limits, cooldowns, auto-grading,
  and human grading for written answers (correct answers never leave the
  server)
- Decision emails for submitted / approved / more-info / waitlisted /
  declined

Not yet built: admin jurisdiction-rule editor, reviewer workspace,
automatic gold-task seeding, consensus computation job, appeals UI.

## Phase 4 — Client platform ⏳ not started

Dashboard, project creation wizard, project overview/tasks/quality/exports,
team management, billing. `ClientProfile`/`Organization` models exist;
onboarding UI does not yet.

## Phase 5 — Admin platform 🚧 mostly built

All 18 admin routes are built: dashboard, trainers list + detail,
applications review, clients, projects, tasks, review queue, quality
(with live Krippendorff's alpha), assessments + written-answer grading,
payouts, invoices, disputes, support, fraud, compliance, audit logs,
users & roles, and settings.

Not yet built: project creation/editing from the admin side, task import,
reviewer assignment, and the reviewer workspace itself.

## Phase 5b — Original "not started" scope ⏳

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
