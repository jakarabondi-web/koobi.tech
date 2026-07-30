/**
 * Answer key for the application screener. Lives under src/server (never
 * import from a client component) so the key never ships in a client
 * bundle — the client file (lib/constants/screener.ts) carries prompts
 * and options alone.
 */
export const SCREENER_ANSWER_KEY: Record<string, string> = {
  "screener-quality": "Response B — correct and honest beats long and wrong",
  "screener-verify": "Verify the claim before scoring it",
};

/** Grades screener answers, returning a 0–1 score. */
export function gradeScreener(answers: Record<string, string>): number {
  const ids = Object.keys(SCREENER_ANSWER_KEY);
  const correct = ids.filter((id) => (answers[id] ?? "").trim() === SCREENER_ANSWER_KEY[id]).length;
  return ids.length > 0 ? correct / ids.length : 0;
}
