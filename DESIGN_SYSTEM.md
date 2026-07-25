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

Core palette is **Slate**: a cool, deliberately low-chroma family running
from deep charcoal-blue (`--navy`, used for the sidebar) through muted steel
blue (`--primary`, `--accent-violet`, `--accent-cyan`) over near-white
surfaces. The chrome stays quiet on purpose — the ambient mesh supplies the
colour interest, so the UI itself doesn't compete with the data.

Semantic colours (`success`/`warning`/`destructive`) keep real hue and are
deliberately *not* desaturated to match the brand: they carry meaning, not
identity. Both light and dark themes are implemented via `next-themes`
(`class` strategy).

## Ambient backgrounds

Two canvas components give the product a consistent techy identity without
turning dashboards into decoration:

- `NeuralMesh` (`components/shared/neural-mesh.tsx`) — depth-shaded particle
  network. Each node carries a `z` depth driving hue (steel → slate blue),
  size, and brightness, so it reads dimensionally instead of as one flat
  colour. `fade="up"` dissolves it toward the top of a container, which is
  how the sidebar keeps its brand mark and links legible.
- `AmbientGrid` (`components/shared/ambient-grid.tsx`) — very low-contrast
  blueprint grid with a slow vertical scan, sitting behind dashboard content.

Where they're used: the marketing hero runs a full mesh; every dashboard
(trainer, client, admin) runs a mesh in the sidebar and the grid behind
content, via `DashboardShell`.

Both honour `prefers-reduced-motion` (static frame, no animation loop) and
stop rendering entirely while the tab is hidden, so an idle background tab
costs nothing. Content sits at `z-10` above them; the canvases are
`aria-hidden` and `pointer-events-none`.

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
