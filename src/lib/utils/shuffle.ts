/**
 * Fisher-Yates shuffle — returns a new array in uniformly random order.
 *
 * `array.sort(() => Math.random() - 0.5)` looks like a shuffle but isn't
 * one: comparator-based sorts assume a consistent ordering, and a random
 * comparator breaks that assumption. The result is a biased distribution
 * that depends on the sort algorithm's implementation details (V8 uses
 * insertion sort for small arrays, which tends to leave early elements
 * close to their original position) — some permutations come up far more
 * often than others. That bias is exactly what let the same handful of
 * assessment questions keep getting drawn across different accounts.
 */
export function shuffle<T>(items: readonly T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
