<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Keep onboarding/gating copy in sync

The trainer gate (`src/lib/permissions/gating.ts`), the onboarding stepper (`src/lib/permissions/onboarding-steps.ts`), and any user-facing explanatory text about the approval flow — e.g. the trainer dashboard's "What happens next" card (`src/app/trainer/dashboard/page.tsx`) — describe the same sequence from different angles. Whenever a change adds, removes, or reorders a step in that sequence (an assessment stage, identity verification, the readiness program, etc.), grep for other places that narrate the flow in prose and update them in the same change, not as a follow-up. Stale copy here reads as a real bug to a trainee waiting on their application, not a cosmetic issue.
