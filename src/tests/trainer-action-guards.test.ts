import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const ACTIONS_DIR = join(process.cwd(), "src/server/actions");

/**
 * Server actions a trainer can invoke that hand out work, money, or a
 * judgement affecting someone else's pay.
 *
 * A page guard stops navigation; it does not stop a crafted request to the
 * action itself. These must check the gate on their own.
 */
const MUST_CHECK_GATE: Record<string, string[]> = {
  "tasks.ts": ["assertCanAccessAssignments"],
  "projects.ts": ["assertCanAccessAssignments"],
  "reviews.ts": ["assertClearedForTrainerWork"],
  "adjudication.ts": ["assertClearedForTrainerWork"],
  "payouts.ts": ["assertClearedForTrainerWork"],
};

describe("trainer server actions check the gate, not just the page", () => {
  it.each(Object.entries(MUST_CHECK_GATE))("%s calls a gate assertion", (file, expected) => {
    const source = readFileSync(join(ACTIONS_DIR, file), "utf8");
    for (const fn of expected) {
      // Match a call, not the import line.
      expect(
        new RegExp(`${fn}\\s*\\(`).test(source),
        `${file} performs trainer work but never calls ${fn}(). A page guard ` +
          `only blocks navigation — the action is still reachable directly.`
      ).toBe(true);
    }
  });

  it("guards every payout entry point a trainer can reach, not just one", () => {
    const source = readFileSync(join(ACTIONS_DIR, "payouts.ts"), "utf8");
    // addPaymentMethod and submitPayoutRequest. approve/decline are staff-only
    // and gated by the payment.issue permission instead.
    const calls = source.match(/assertClearedForTrainerWork\s*\(/g) ?? [];
    expect(calls.length).toBeGreaterThanOrEqual(2);
  });
});
