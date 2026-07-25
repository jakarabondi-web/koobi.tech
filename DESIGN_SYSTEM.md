# Design system

## Brand

All brand copy/links live in `src/config/brand.ts` — change the name,
tagline, and contact/social links there rather than hard-coding strings in
components.

## Tokens

All colors are CSS custom properties in `src/app/globals.css`, defined once
in `:root` (light) and overridden in `.dark`, then mapped into Tailwind's
`@theme inline` block so they're usable as `bg-primary`, `text-accent-violet`,
etc. This is the single place to re-skin the palette.

Core palette: deep navy (`--navy`), indigo primary (`--primary`), electric
violet accent (`--accent-violet`), cyan secondary accent (`--accent-cyan`),
soft blue-gray surfaces (`--surface`), white cards, plus semantic
`success`/`warning`/`destructive`/`info`. Both light and dark themes are
implemented via `next-themes` (`class` strategy); toggle by adding
`data-theme`/`.dark` on `<html>`.

Radius, chart colors (`--chart-1..5`), and sidebar-specific tokens
(`--sidebar*`, used by the dashboard shell) are also defined here.

## Typography

Geist Sans / Geist Mono (`next/font/google`, loaded in `app/layout.tsx`).
Monospace is reserved for task IDs, code, and dataset fields — not general
UI text.

## Components

`src/components/ui/*` are hand-built, shadcn-pattern primitives (cva +
`tailwind-merge` + Radix UI primitives) — the shadcn CLI's registry wasn't
reachable from this environment, so they're authored directly in the same
style rather than generated. Current set: button, badge (+ `badge-status`
for status→color mapping), card, input, textarea, label, select, tabs,
dialog, avatar, progress, tooltip, separator, checkbox, radio-group, switch,
popover, table, skeleton.

`src/components/shared/*` are composed, app-level pieces: `PageHeader`,
`EmptyState`, `KpiCard`, theme/query/session providers.

`src/components/navigation/dashboard-shell.tsx` is the shared sidebar+topbar
shell used by the trainer/client/admin portals; each surface wraps it in a
thin `"use client"` component (`components/trainer/trainer-shell.tsx`, etc.)
that supplies that surface's nav items — this split exists because React
component references can't cross the Server→Client Component prop boundary,
so nav config can't be built in a server layout and passed down directly.

## Adding a component

Match the existing primitives: `"use client"` only if it needs interactivity
or a Radix primitive that uses context; accept `className` and merge with
`cn()`; export variants via `cva` when there's more than one visual style.
