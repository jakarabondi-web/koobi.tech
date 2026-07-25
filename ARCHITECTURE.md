# Architecture

## Applications

Four applications share one Next.js codebase, separated by route group/prefix:

- `src/app/(marketing)` — public site (`/`, `/for-companies`, `/security`, …)
- `src/app/(auth)` — sign-in, registration, password recovery
- `src/app/trainer` — trainer/expert/reviewer portal (RBAC-gated)
- `src/app/client` — AI-company client portal (RBAC-gated, org-scoped)
- `src/app/admin` — internal operations portal (RBAC-gated)

`src/middleware.ts` enforces surface-level access (is this user allowed on
`/trainer/*`, `/client/*`, `/admin/*` at all) using the edge-safe half of the
auth config. This is a first line of defense only — every server action,
route handler, and data-fetching server component must independently check
permissions via `src/lib/permissions`. Never rely on hiding a nav link.

## Directory layout

```
src/
  app/            route groups per application (see above) + api/
  components/     ui/ (primitives), <surface>/ (surface-specific), shared/
  features/       domain feature modules (grows as features land)
  lib/            auth, db, permissions, validation, payments, storage,
                  email, security, analytics, utils — cross-cutting code
  server/         actions/ (server actions), services/, repositories/, jobs/
  types/          shared TS types, next-auth module augmentation
  hooks/          shared React hooks
  config/         brand.ts and other centralized configuration
```

Business logic belongs in `server/` and `lib/`, not inlined in components.
Server Components fetch data directly via Prisma; mutations go through
Server Actions in `server/actions/`.

## Auth

Auth.js (NextAuth v5) with a Credentials provider and JWT sessions (no
database session strategy, so credentials auth works without an adapter).
`src/lib/auth/config.ts` is edge-safe (no Prisma/bcrypt) and is imported
directly by `middleware.ts`. `src/lib/auth/index.ts` extends it with the
Credentials provider (Node runtime only) for the API route handler and
server components/actions.

Session `roles` (a `GlobalRole[]`) drive both surface routing
(`surfaceForRoles`) and fine-grained checks (`can(roles, action)` in
`lib/permissions/can.ts`).

## Database

PostgreSQL via Prisma. See `DATABASE.md` for schema documentation. Dev/test
uses `prisma db push`; real environments should use `prisma migrate`.

## Rendering strategy

Server Components by default; `"use client"` only where interactivity,
browser APIs, or context (Radix primitives, next-auth `signIn`, forms) require
it. Long-running/expensive work (exports, notifications) is expected to move
to a background job runner (BullMQ + Redis) as those features are built —
not yet implemented.
