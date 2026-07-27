import { describe, expect, it } from "vitest";

import { shuffle } from "@/lib/utils/shuffle";

describe("shuffle", () => {
  it("preserves every element, just reorders them", () => {
    const input = [1, 2, 3, 4, 5, 6];
    const result = shuffle(input);
    expect([...result].sort()).toEqual([...input].sort());
    expect(result).toHaveLength(input.length);
  });

  it("does not mutate the input array", () => {
    const input = [1, 2, 3];
    const copy = [...input];
    shuffle(input);
    expect(input).toEqual(copy);
  });

  it("does not systematically favor the same element staying first", () => {
    // array.sort(() => Math.random() - 0.5) is a documented anti-pattern:
    // it's biased toward leaving early elements near their original
    // position, because comparator-based sorts assume a consistent
    // ordering and a random comparator breaks that assumption. That bias
    // is exactly what caused different accounts to keep drawing the same
    // assessment questions. A real shuffle should land any given element
    // in the first slot roughly 1/n of the time, not far more often.
    const n = 6;
    const items = Array.from({ length: n }, (_, i) => i);
    const trials = 3000;
    let firstIsZero = 0;
    for (let i = 0; i < trials; i++) {
      if (shuffle(items)[0] === 0) firstIsZero++;
    }
    const observed = firstIsZero / trials;
    const expected = 1 / n; // ~0.1667
    // Generous tolerance to keep this non-flaky — the biased sort()
    // approach it replaces was off by roughly 2x, so this would easily
    // catch a regression back to that pattern.
    expect(observed).toBeGreaterThan(expected * 0.7);
    expect(observed).toBeLessThan(expected * 1.3);
  });

  it("produces many distinct orderings across repeated calls", () => {
    const items = [1, 2, 3, 4, 5, 6];
    const seen = new Set<string>();
    for (let i = 0; i < 200; i++) {
      seen.add(shuffle(items).join(","));
    }
    expect(seen.size).toBeGreaterThan(1);
  });
});
