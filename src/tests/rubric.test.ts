import { describe, expect, it } from "vitest";

import {
  RUBRIC_PRESETS,
  parseCriteria,
  rubricCriteriaSchema,
  weightedScore,
  type Criterion,
} from "@/lib/tasks/rubric";

const criterion = (key: string, weight = 1): Criterion => ({
  key,
  label: key,
  description: "",
  weight,
});

describe("rubricCriteriaSchema", () => {
  it("accepts a valid rubric", () => {
    expect(rubricCriteriaSchema.safeParse([criterion("correctness")]).success).toBe(true);
  });

  it("rejects an empty rubric", () => {
    expect(rubricCriteriaSchema.safeParse([]).success).toBe(false);
  });

  it("rejects duplicate keys", () => {
    const result = rubricCriteriaSchema.safeParse([criterion("a"), criterion("a")]);
    expect(result.success).toBe(false);
  });

  it("rejects keys that aren't machine-safe", () => {
    expect(rubricCriteriaSchema.safeParse([criterion("Not Valid!")]).success).toBe(false);
  });

  it("caps the number of criteria", () => {
    const many = Array.from({ length: 13 }, (_, i) => criterion(`c${i}`));
    expect(rubricCriteriaSchema.safeParse(many).success).toBe(false);
  });
});

describe("parseCriteria", () => {
  it("returns valid criteria unchanged", () => {
    const input = [criterion("correctness", 2)];
    expect(parseCriteria(input)).toEqual(input);
  });

  it("upgrades the legacy { categories: [...] } shape", () => {
    const upgraded = parseCriteria({ categories: ["correctness", "instruction_following"] });

    expect(upgraded).toHaveLength(2);
    expect(upgraded[0].key).toBe("correctness");
    // Legacy rows had no label; one is derived so the UI has something to show.
    expect(upgraded[1].label).toBe("Instruction Following");
    expect(upgraded[0].weight).toBe(1);
  });

  it("falls back to the general preset for unusable input", () => {
    expect(parseCriteria(null)).toEqual(RUBRIC_PRESETS.general.criteria);
    expect(parseCriteria("nonsense")).toEqual(RUBRIC_PRESETS.general.criteria);
  });
});

describe("weightedScore", () => {
  it("maps a straight 5 to 1 and a straight 1 to 0", () => {
    const criteria = [criterion("a"), criterion("b")];
    expect(weightedScore(criteria, { a: 5, b: 5 })).toBe(1);
    expect(weightedScore(criteria, { a: 1, b: 1 })).toBe(0);
  });

  it("puts a mid score at the midpoint", () => {
    expect(weightedScore([criterion("a")], { a: 3 })).toBeCloseTo(0.5, 5);
  });

  it("weights heavier criteria more", () => {
    const criteria = [criterion("important", 3), criterion("minor", 1)];
    // Strong on the heavy criterion, weak on the light one.
    const strong = weightedScore(criteria, { important: 5, minor: 1 })!;
    // The reverse.
    const weak = weightedScore(criteria, { important: 1, minor: 5 })!;

    expect(strong).toBeGreaterThan(weak);
    expect(strong).toBeCloseTo(0.75, 5);
    expect(weak).toBeCloseTo(0.25, 5);
  });

  it("ignores criteria with no score rather than treating them as zero", () => {
    const criteria = [criterion("a"), criterion("b")];
    // Only 'a' was scored; the result should reflect 'a' alone, not a
    // penalty for the missing one.
    expect(weightedScore(criteria, { a: 5 })).toBe(1);
  });

  it("returns null when nothing was scored", () => {
    expect(weightedScore([criterion("a")], {})).toBeNull();
  });
});

describe("presets", () => {
  it("every preset is itself a valid rubric", () => {
    for (const [name, preset] of Object.entries(RUBRIC_PRESETS)) {
      const result = rubricCriteriaSchema.safeParse(preset.criteria);
      expect(result.success, `${name} preset should be valid`).toBe(true);
    }
  });

  it("weights safety highest in the safety preset", () => {
    const safety = RUBRIC_PRESETS.safety.criteria;
    const top = [...safety].sort((a, b) => b.weight - a.weight)[0];
    expect(top.key).toBe("safety");
  });
});
