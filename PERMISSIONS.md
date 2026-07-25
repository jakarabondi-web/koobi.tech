# Permissions

## Roles

`GlobalRole` (`src/lib/permissions/roles.ts`):

`TRAINER`, `EXPERT`, `REVIEWER`, `LEAD_REVIEWER`, `CLIENT_MEMBER`,
`CLIENT_ADMIN`, `OPERATIONS_MANAGER`, `QUALITY_MANAGER`, `FINANCE_MANAGER`,
`SUPPORT_AGENT`, `SUPER_ADMIN`.

A user can hold multiple roles (`UserRole` join table).

## Surfaces

Roles map to one of three application surfaces (`surfaceForRoles`):

- **trainer** — `TRAINER`, `EXPERT`, `REVIEWER`, `LEAD_REVIEWER`
- **client** — `CLIENT_MEMBER`, `CLIENT_ADMIN`
- **admin** — `OPERATIONS_MANAGER`, `QUALITY_MANAGER`, `FINANCE_MANAGER`,
  `SUPPORT_AGENT`, `SUPER_ADMIN`

`middleware.ts` blocks unauthenticated or wrong-surface requests to
`/trainer/*`, `/client/*`, `/admin/*` before they reach a page. This is a
convenience redirect, **not** the authorization boundary.

## The authorization boundary

Every Server Action and Route Handler that mutates or reads sensitive data
must call `can(session.user.roles, action)` (or `assertCan`, which throws
`ForbiddenError`) from `src/lib/permissions/can.ts`. Add new actions to the
`Action` union and `RULES` map there — do not scatter role checks as ad-hoc
`if` statements across the codebase.

```ts
import { assertCan } from "@/lib/permissions/can";

export async function approveTrainer(userId: string) {
  const session = await auth();
  assertCan(session?.user.roles ?? [], "trainer.approve");
  // ...
}
```

## Tenant isolation

Client-portal data additionally requires organization membership, not just
role. Any read/write of `Project`, `Dataset`, `Invoice`, etc. must filter by
an `organizationId` the session user actually belongs to
(`OrganizationMember`) — role alone (e.g. `CLIENT_ADMIN`) is not sufficient
to prove access to a specific organization's data.

## What's implemented vs. planned

Implemented: role model, surface routing, the `can()` rule table, JWT
sessions carrying roles, server-enforced middleware gate.

Planned: per-project fine-grained permissions (`ProjectMember.role`),
reviewer identity-shielding enforcement in the task/review UI, and audit-log
writes on every `can()`-gated mutation.
