/**
 * Counts "real" words in free text: tokens with at least two letters.
 *
 * Splitting on whitespace alone would count "a a a a a a a a a a a a a a a"
 * as 15 words — this filters out single characters and punctuation-only
 * tokens so a minimum-word-count check can't be satisfied by gibberish.
 */
export function countWords(text: string): number {
  const matches = text.match(/[\p{L}\p{N}]{2,}/gu);
  return matches?.length ?? 0;
}

// A character-length minimum let a single word, or nonsense keysmashing,
// through — "aaaaaaaaaa" cleared a min(10) character check. A word count is
// what a reviewer actually needs: enough to read as a real background
// summary, not a placeholder. 15 words is the common floor for a short
// professional bio (roughly a sentence and a half).
export const MIN_BACKGROUND_WORDS = 15;
