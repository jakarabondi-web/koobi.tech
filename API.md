# API

## Two ways in

First-party UI (marketing forms, auth, registration, every portal screen)
goes through Next.js Server Actions in `src/server/actions/*`, called
directly from React forms. There is no HTTP contract to keep stable there,
so there isn't one.

Client organizations that want programmatic access use the versioned REST
API below. It is authenticated by API key, never by session cookie.

## Authentication

```
Authorization: Bearer tra_live_9f3a1c2b_<secret>
```

Keys are issued from **Client portal → API & webhooks**, by an organization
admin. Details that matter:

- The key is displayed **once**, at creation. Only a SHA-256 digest is
  stored (`src/lib/api/keys.ts`), so a lost key can be revoked and reissued
  but never recovered.
- The `prefix` (`tra_live_9f3a1c2b`) is not secret. It appears in the UI and
  in audit metadata so a key can be identified without exposing it.
- Scopes are `READ` or `READ + WRITE`. A read-only key gets
  `403 insufficient_scope` on any mutating call.
- Keys may carry an expiry. Revoked and expired keys are rejected
  identically to keys that never existed.

**The organization is resolved from the key and nothing else.** An
`organizationId` in a request body or query string is ignored. This is the
same rule `server/services/tenant.ts` enforces for the UI, implemented for
the API in `server/services/api-auth.ts`.

## Endpoints

| Method | Path | Scope | Purpose |
| --- | --- | --- | --- |
| GET | `/api/v1/projects` | read | List your projects |
| POST | `/api/v1/projects` | write | Create a project (starts as `DRAFT`) |
| GET | `/api/v1/projects/:id` | read | Project detail with task status counts |
| PATCH | `/api/v1/projects/:id` | write | Update name, status, quality settings |
| GET | `/api/v1/tasks?project_id=` | read | List tasks and their status |
| POST | `/api/v1/tasks` | write | Ingest tasks |
| GET | `/api/v1/submissions?project_id=` | read | Retrieve completed evaluations |
| GET | `/api/v1/exports` | read | List dataset exports |
| POST | `/api/v1/exports` | write | Queue a dataset export |
| GET | `/api/v1/exports/:id` | read | Poll a single export |

### Conventions

- JSON in, JSON out. Field names are `snake_case`.
- List responses are
  `{ data: [...], pagination: { total, limit, offset, has_more } }`.
  `limit` defaults to 50 and is capped at 200.
- Errors are `{ error: { code, message, ...context } }`. `code` is stable
  and machine-readable; `message` is for a human reading logs.
- Bodies are capped at 2 MB, enforced on bytes actually read — omitting
  `content-length` does not skip the check.
- An unknown value for an enum filter (`status`, `decision`) returns
  `400 invalid_parameter` naming the accepted values, not a 500.
- A project or dataset belonging to another organization returns the same
  `404 not_found` as one that doesn't exist — distinguishing them would let
  a key enumerate other tenants' ids.

### Ingesting tasks

```bash
curl -X POST https://traivr.com/api/v1/tasks \
  -H "Authorization: Bearer $TRAIVR_KEY" \
  -H "content-type: application/json" \
  -d '{
    "project_id": "…",
    "tasks": [
      {"external_ref": "row-1", "prompt": "…", "response_a": "…", "response_b": "…"},
      {"external_ref": "row-2", "prompt": "…", "response_a": "…", "response_b": "…",
       "is_gold": true, "expected_answer": "a"}
    ]
  }'
```

- Required fields depend on the project's task type and may be written in
  either `camelCase` or `snake_case`.
- **Ingestion is idempotent on `external_ref`.** Re-sending a batch creates
  only the rows that are new; the rest come back as `skipped_duplicates`.
  Retrying a request whose response you never saw is safe.
- Valid rows are written even when others fail. The response lists every
  rejected row by its index in the array you sent:

```json
{"data": {"created": 3, "gold_created": 1, "skipped_duplicates": 0,
          "rejected": [{"index": 3, "message": "Missing required fields: responseA (or response_a), responseB (or response_b)"}]}}
```

- Gold rows need both `expected_answer` and `external_ref` — the expected
  answer is linked back by ref after insert, so a gold row without one would
  silently lose its answer.
- Maximum 5,000 tasks per request.

Ingestion runs through the same parser as the upload screen
(`src/lib/tasks/import-parser.ts`), so the API and the UI cannot drift into
accepting different data.

### Retrieving results

```bash
curl "https://traivr.com/api/v1/submissions?project_id=…&decision=APPROVED&since=2026-01-01T00:00:00Z" \
  -H "Authorization: Bearer $TRAIVR_KEY"
```

Filter by `decision` (`APPROVED`, `REJECTED`, `REVISION_REQUESTED`,
`ESCALATED`) and `since`. Results are ordered oldest-first, so `since` can
be used to page forward through new work.

`submitted_by` is **not** in the response and will not be added. Clients buy
evaluations, not the identities of the people who produced them.

## Known gaps

- **Export processing is not implemented.** `POST /api/v1/exports` records
  the request and returns `202`; the row stays `QUEUED` and `file_url` stays
  null. A real deployment hands this to a worker that writes to object
  storage and flips the row to `READY` with a signed URL.
- **Webhooks are not implemented.** The `Webhook`/`WebhookDelivery` models
  exist; nothing dispatches them. Poll `GET /api/v1/exports/:id` meanwhile.
- **No rate limiting.** Keys are unthrottled. This needs to exist before the
  API is exposed publicly.
- **No `DELETE`.** Projects and tasks can't be removed over the API.

## Internal data access

Server Components and Server Actions call Prisma directly
(`src/lib/db/prisma.ts`) rather than going through an internal HTTP API.
There is no `server/repositories` implementation despite the directory
existing in the architecture; add repository modules there as query logic
needs to be shared or tested independently of the calling action.
