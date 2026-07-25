# API

## Current state

Most mutations currently go through Next.js Server Actions
(`src/server/actions/*`), called directly from React forms — not versioned
HTTP endpoints. This is intentional for first-party UI (marketing forms,
auth, registration) where a public API contract isn't needed yet.

Implemented so far:

- `POST /api/auth/[...nextauth]` — Auth.js credential sign-in/sign-out
  (`src/app/api/auth/[...nextauth]/route.ts`).
- Server Actions: `submitContactForm`, `registerUser`,
  `requestPasswordReset`, `resetPassword`.

## Planned: versioned client-facing API

Per the product spec, client organizations should eventually be able to
manage projects and pull results programmatically over a versioned REST API:

```
/api/v1/projects       — create/list projects
/api/v1/tasks          — ingest tasks, retrieve status
/api/v1/submissions    — retrieve submissions/results
/api/v1/exports        — trigger and retrieve dataset exports
```

These are not implemented yet. When built, they must:

- Authenticate via `ApiKey` (hashed at rest, scoped to an `Organization`),
  not session cookies.
- Enforce the same tenant isolation and `can()` permission checks as the UI
  — an API key must not be able to read another organization's data.
- Emit `Webhook`/`WebhookDelivery` events for async operations (export
  ready, task status change) rather than requiring polling.

## Internal data access

Server Components and Server Actions call Prisma directly
(`src/lib/db/prisma.ts`) rather than going through an internal HTTP API —
there is no `server/repositories` implementation yet despite the directory
existing in the architecture; add repository modules there as query logic
needs to be shared/tested independently of the calling action.
