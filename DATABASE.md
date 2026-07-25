# Database

PostgreSQL, modeled in `prisma/schema.prisma`. All IDs are UUIDs; all models
carry `createdAt`/`updatedAt` where meaningful; enums are used for closed
status sets.

## Entity groups

- **Identity & RBAC** — `User`, `Account`, `Session`, `Role`, `Permission`,
  `UserRole`, `ConsentRecord`. Roles are the `GlobalRole` enum (trainer,
  expert, reviewer, lead reviewer, client member/admin, operations/quality/
  finance managers, support agent, super admin) — see `PERMISSIONS.md`.
- **Organizations (tenants)** — `Organization`, `OrganizationMember`,
  `ClientProfile`. All client-owned data (`Project`, `Dataset`, `Invoice`,
  `BillingAccount`, `ApiKey`, `Webhook`) hangs off `Organization` for tenant
  isolation.
- **Trainer profile** — `TrainerProfile`, `Education`, `Employment`,
  `Skill`/`UserSkill`, `Language`/`UserLanguage`, `IdentityVerification`,
  `Application` (onboarding application state machine).
- **Assessments** — `Assessment`, `AssessmentQuestion`, `AssessmentAttempt`,
  `AssessmentResponse`.
- **Projects & tasks** — `Project`, `ProjectMember`, `ProjectQualification`,
  `ProjectApplication`, `ProjectAssignment`, `TaskTemplate`, `Task`,
  `TaskAssignment`, `TaskSubmission`, `SubmissionVersion`, `GoldTask`.
- **Review & quality** — `ReviewRubric`, `Review`, `ReviewScore`,
  `QualityMetric`, `QualitySnapshot`.
- **Datasets & exports** — `Dataset`, `DatasetItem`, `Export`.
- **Payments & billing** — `PaymentAccount`, `Earning`, `Payment`,
  `BillingAccount`, `Invoice`.
- **Support & disputes** — `SupportTicket`, `SupportMessage`, `Dispute`.
- **Notifications, compliance & risk** — `Notification`, `AuditLog`,
  `RiskFlag`, `FileAsset`, `ApiKey`, `Webhook`, `WebhookDelivery`.

## Conventions

- Soft deletion: `User.deletedAt` exists; extend this pattern per-model as
  retention requirements are implemented (not all models soft-delete yet).
- Tenant isolation: every query that reads client-owned data must filter by
  `organizationId` derived from the authenticated session — never trust an
  `organizationId` passed from the client without checking membership.
- Money is stored as integer cents (`*Cents` fields) to avoid float drift.

## Working with the schema

```bash
npm run db:push       # dev: sync schema without generating a migration
npm run db:migrate    # generate + apply a named migration
npm run db:studio     # browse data
npm run db:seed       # load demo data (see README for demo accounts)
```

Prisma is pinned to v6 (not v7) — v7 moved datasource URLs out of
`schema.prisma` into a new `prisma.config.ts` + driver-adapter model that is
still stabilizing; v6 keeps the standard `datasource { url = env(...) }`
pattern that the rest of the ecosystem (docs, adapters) expects.
