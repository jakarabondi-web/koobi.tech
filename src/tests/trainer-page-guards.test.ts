import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const TRAINER_APP_DIR = join(process.cwd(), "src/app/trainer");

/**
 * Pages an applicant is *supposed* to reach before approval: their own
 * account, and the steps that get them approved.
 *
 * Everything else in the trainer portal must be gated. The list is written
 * as an allowlist rather than a blocklist on purpose — a new page added
 * without a guard then fails this test by default, instead of quietly
 * shipping open. Adding a route here should be a deliberate decision.
 */
const APPLICANT_ACCESSIBLE = new Set([
  "dashboard",
  "onboarding",
  "verification",
  "verification/simulate",
  "assessments",
  "assessments/[id]/attempt/[attemptId]",
  "notifications",
  "profile",
  "settings",
  "support",
  "support/tickets",
]);

/**
 * Either the redirect guard, or an in-page blocked view. Both close the door.
 *
 * These match an actual *call*, not the bare identifier: an earlier version
 * matched the import line too, so deleting the call while leaving the import
 * behind — exactly what a careless edit looks like — still passed.
 */
const GUARD_PATTERNS = [/requireApprovedTrainer\s*\(/, /\.canAccessAssignments\b/];

function trainerPages(dir = TRAINER_APP_DIR, prefix = ""): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const next = join(dir, entry.name);
    if (entry.isDirectory()) {
      found.push(...trainerPages(next, prefix ? `${prefix}/${entry.name}` : entry.name));
    } else if (entry.name === "page.tsx" && prefix) {
      found.push(prefix);
    }
  }
  return found;
}

describe("trainer portal access before approval", () => {
  const pages = trainerPages();

  it("finds the trainer pages to check", () => {
    expect(pages.length).toBeGreaterThan(15);
  });

  it.each(pages)("%s is either applicant-safe or gated", (route) => {
    if (APPLICANT_ACCESSIBLE.has(route)) return;

    const source = readFileSync(join(TRAINER_APP_DIR, route, "page.tsx"), "utf8");
    const guarded = GUARD_PATTERNS.some((p) => p.test(source));

    expect(
      guarded,
      `/trainer/${route} shows work, earnings or review data but never checks the ` +
        `trainer gate, so an applicant can reach it by typing the URL. Call ` +
        `requireApprovedTrainer(), or add the route to APPLICANT_ACCESSIBLE if it ` +
        `genuinely should be open before approval.`
    ).toBe(true);
  });

  it("keeps every allowlisted route real, so the list can't rot", () => {
    for (const route of APPLICANT_ACCESSIBLE) {
      expect(pages, `${route} is allowlisted but no longer exists`).toContain(route);
    }
  });
});
