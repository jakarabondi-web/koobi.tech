/**
 * The short judgment screener embedded in the trainer application — the
 * first stage of the assessment funnel (screener → qualification exam →
 * post-approval readiness program).
 *
 * Client-safe: prompts and options only. The answer key lives in
 * src/server/services/screener-key.ts and must never be imported from a
 * client component.
 */

export type ScreenerQuestion = {
  id: string;
  prompt: string;
  options: string[];
};

export const SCREENER_QUESTIONS: ScreenerQuestion[] = [
  {
    id: "screener-quality",
    prompt:
      "A model gives two responses to the same question. Response A is long and confident but contains a subtle factual error. Response B is shorter, correct, and notes one limitation. Which should be rated higher?",
    options: [
      "Response A — length and confidence show more effort",
      "Response B — correct and honest beats long and wrong",
      "They should be rated equally",
      "Whichever has the friendlier tone",
    ],
  },
  {
    id: "screener-verify",
    prompt:
      "While evaluating a response, you're not sure whether one of its factual claims is true. What's the right move?",
    options: [
      "Mark it correct — it sounds plausible",
      "Verify the claim before scoring it",
      "Skip verification to keep your task throughput high",
      "Mark it incorrect, just to be safe",
    ],
  },
];
