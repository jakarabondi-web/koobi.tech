import { describe, expect, it } from "vitest";

import { countWords, MIN_BACKGROUND_WORDS } from "@/lib/utils/word-count";

describe("countWords", () => {
  it("counts space-separated words", () => {
    expect(countWords("Senior backend engineer with distributed systems experience")).toBe(7);
  });

  it("does not count single-character tokens as words", () => {
    // A keysmash of single characters used to clear a character-length
    // minimum outright; it must not clear a word-count one either.
    expect(countWords("a a a a a a a a a a a a a a a")).toBe(0);
  });

  it("ignores punctuation-only tokens", () => {
    expect(countWords("Backend engineer - - - - 8 years experience.")).toBe(4);
  });

  it("a real one-sentence background falls short of the minimum", () => {
    const oneWord = "Engineer.";
    expect(countWords(oneWord)).toBeLessThan(MIN_BACKGROUND_WORDS);
  });

  it("a genuine short background summary clears the minimum", () => {
    const real =
      "Senior backend engineer with eight years of experience building distributed " +
      "systems, plus two years evaluating code-generation models for accuracy and safety.";
    expect(countWords(real)).toBeGreaterThanOrEqual(MIN_BACKGROUND_WORDS);
  });
});
