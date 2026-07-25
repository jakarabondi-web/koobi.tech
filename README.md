# Trainora AI

Implementation of the Trainora AI platform design (`Trainora-guide.png`) — a
marketplace connecting AI teams with verified experts who create, evaluate, and
improve training data.

Three surfaces are built:

| Route        | Surface                                                              |
| ------------ | -------------------------------------------------------------------- |
| `/`          | Marketing site — hero, trust logos, stats, capabilities, global network, CTA |
| `/admin`     | Admin console — platform KPIs, task trends, projects, alerts, leaderboard |
| `/dashboard` | Expert dashboard — earnings, active tasks, weekly progress, recommendations |

## Stack

Per the implementation guide in the design:

- **Next.js 14** (App Router) + **TypeScript**
- **Tailwind CSS** with shadcn/ui-style component primitives
- **Recharts** for charts, **lucide-react** for icons

## Getting started

```bash
npm install
npm run dev      # http://localhost:3000
```

Other scripts: `npm run build`, `npm run start`, `npm run lint`, `npm run typecheck`.

## Design tokens

Defined as CSS variables in `src/app/globals.css` and mapped in
`tailwind.config.ts`:

| Token         | Value                                        |
| ------------- | -------------------------------------------- |
| Primary       | `#16a34a` (green-600)                        |
| Secondary     | `#059669` (emerald-600)                      |
| Accent        | `#10b981` (emerald-500)                      |
| Border radius | `12px` (lg), `8px` (md)                      |
| Shadows       | `sm` / `md` / `lg`                           |
| Spacing       | 4px base scale                               |
| Content width | `1400px` (`max-w-content`)                   |
| Font          | Inter (`next/font`)                          |

## Project structure

```
src/
  app/
    page.tsx              Marketing landing page
    admin/                Admin console layout + overview
    dashboard/            Expert dashboard layout + overview
  components/
    ui/                   Button, Card, Badge, Avatar, Progress, Table
    brand/                Logo and logomark
    marketing/            Landing page sections
    dashboard/            Sidebar, topbar, stat cards, panel shell
    charts/               Recharts wrappers + shared chart theme
    admin/                Admin-specific panels
    expert/               Expert-specific panels
  lib/
    types.ts              Data schema for every surface
    mock-data.ts          Mock data matching that schema
    navigation.ts         Sidebar navigation trees
    utils.ts              `cn` plus number/currency formatters
```

## Data

All screens read from `src/lib/mock-data.ts`, typed by `src/lib/types.ts`.
Swapping in a real API only requires returning the same shapes — no component
changes needed.

## Accessibility

- Every chart carries a `role="img"` description of its contents.
- Interactive elements have visible focus rings and accessible names.
- The leaderboard uses a real `<table>` with a caption and scoped headers.
- Sidebar navigation exposes `aria-current="page"` for the active route.

## Responsive

Layouts are verified with no horizontal overflow at 390px, 820px, and 1440px.
The dashboard sidebar collapses into a drawer below the `lg` breakpoint.
