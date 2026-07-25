import { describe, expect, it } from "vitest";

import { bandFor, krippendorffAlpha, majorityAgreement, type Rating } from "@/lib/analytics/agreement";

function ratings(rows: Array<[string, string, string]>): Rating[] {
  return rows.map(([itemId, raterId, value]) => ({ itemId, raterId, value }));
}

describe("krippendorffAlpha", () => {
  it("returns 1 for perfect agreement across raters", () => {
    const data = ratings([
      ["t1", "r1", "A"],
      ["t1", "r2", "A"],
      ["t2", "r1", "B"],
      ["t2", "r2", "B"],
    ]);
    expect(krippendorffAlpha(data)).toBeCloseTo(1, 5);
  });

  it("sits near 0 when agreement is about what chance predicts", () => {
    // Half the items agree, half split, labels balanced overall — observed
    // disagreement (0.5) lands close to chance expectation (0.571).
    const data = ratings([
      ["t1", "r1", "A"],
      ["t1", "r2", "A"],
      ["t2", "r1", "B"],
      ["t2", "r2", "B"],
      ["t3", "r1", "A"],
      ["t3", "r2", "B"],
      ["t4", "r1", "B"],
      ["t4", "r2", "A"],
    ]);
    expect(krippendorffAlpha(data)).toBeCloseTo(0.125, 3);
  });

  it("is negative for systematic disagreement on every item", () => {
    // Raters never agree, so this is worse than chance, not merely random.
    const data = ratings([
      ["t1", "r1", "A"],
      ["t1", "r2", "B"],
      ["t2", "r1", "B"],
      ["t2", "r2", "A"],
    ]);
    expect(krippendorffAlpha(data)).toBeCloseTo(-0.5, 5);
  });

  it("goes negative when disagreement exceeds chance", () => {
    const data = ratings([
      ["t1", "r1", "A"],
      ["t1", "r2", "B"],
      ["t2", "r1", "A"],
      ["t2", "r2", "B"],
      ["t3", "r1", "A"],
      ["t3", "r2", "B"],
    ]);
    expect(krippendorffAlpha(data)!).toBeLessThan(0);
  });

  it("handles missing ratings — items may have different rater counts", () => {
    const data = ratings([
      ["t1", "r1", "A"],
      ["t1", "r2", "A"],
      ["t1", "r3", "A"],
      ["t2", "r1", "B"],
      ["t2", "r2", "B"],
      ["t3", "r2", "A"], // single rating, contributes nothing
    ]);
    expect(krippendorffAlpha(data)).toBeCloseTo(1, 5);
  });

  it("returns null when no item has two or more ratings", () => {
    expect(krippendorffAlpha(ratings([["t1", "r1", "A"]]))).toBeNull();
    expect(krippendorffAlpha([])).toBeNull();
  });

  it("returns 1 when every rater used the same single label", () => {
    const data = ratings([
      ["t1", "r1", "A"],
      ["t1", "r2", "A"],
      ["t2", "r1", "A"],
      ["t2", "r2", "A"],
    ]);
    expect(krippendorffAlpha(data)).toBe(1);
  });
});

describe("majorityAgreement", () => {
  it("is 1 when all raters agree", () => {
    const data = ratings([
      ["t1", "r1", "A"],
      ["t1", "r2", "A"],
    ]);
    expect(majorityAgreement(data)).toBe(1);
  });

  it("reflects the modal share on split items", () => {
    const data = ratings([
      ["t1", "r1", "A"],
      ["t1", "r2", "A"],
      ["t1", "r3", "B"],
    ]);
    expect(majorityAgreement(data)).toBeCloseTo(2 / 3, 5);
  });
});

describe("bandFor", () => {
  it("classifies against the conventional thresholds", () => {
    expect(bandFor(0.85)).toBe("reliable");
    expect(bandFor(0.8)).toBe("reliable");
    expect(bandFor(0.7)).toBe("tentative");
    expect(bandFor(0.5)).toBe("unreliable");
    expect(bandFor(null)).toBeNull();
  });
});
