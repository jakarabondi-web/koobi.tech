# Development

## Prerequisites

- Node.js 20+
- A PostgreSQL 14+ instance

## Local setup

```bash
npm install
cp .env.example .env    # then set DATABASE_URL and AUTH_SECRET
npm run db:push
npm run db:seed
npm run dev
```

## Conventions

- Strict TypeScript; avoid `any`. `npx tsc --noEmit` should be clean.
- ESLint (`npm run lint`) should be clean before committing.
- Business logic goes in `lib/` or `server/`, not directly in page/component
  bodies — pages should mostly compose data-fetching + presentation.
- Every server action validates input with Zod and returns a typed state
  object (`{ status, errors? }`) for `useActionState` — see
  `server/actions/register.ts` for the pattern.
- New Prisma models: update `prisma/schema.prisma`, run `npm run db:push`
  (dev) or `npm run db:migrate` (to record a migration), then
  `npm run db:generate` if the client wasn't regenerated automatically.
- New permission-gated actions: add the action key to
  `lib/permissions/can.ts` rather than checking roles inline — see
  `PERMISSIONS.md`.

## Running against a real browser

Playwright is available for manual verification (`npx playwright` with
`executablePath: '/opt/pw-browsers/chromium'` in sandboxed environments that
pre-install Chromium). There is no committed Playwright test suite yet.

## Known environment quirks

- Prisma is pinned to v6, not v7 — see `DATABASE.md`.
- `@radix-ui/react-slot`-based components (`Button`, `Badge`) must stay
  `"use client"` — Slot's `createContext` usage breaks in a Server Component
  under this Next.js version.
- Nav configs for the dashboard shells live in small per-surface
  `"use client"` wrapper components, not the server `layout.tsx` files — see
  `DESIGN_SYSTEM.md` for why.
