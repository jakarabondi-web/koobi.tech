import { prisma } from "@/lib/db/prisma";
import { openAdjudication } from "@/server/services/adjudication";

const SHINGLE_SIZE = 5;
const HIGH_SIMILARITY = 0.85;
const MEDIUM_SIMILARITY = 0.6;
/** Below this many words, shingle overlap is noisy enough to false-positive on boilerplate phrasing. */
const MIN_WORD_COUNT = 12;

function normalize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, "")
    .split(/\s+/)
    .filter(Boolean);
}

/** Overlapping N-word windows ("shingles") — the standard building block for near-duplicate text detection. */
function shingles(words: string[], size = SHINGLE_SIZE): Set<string> {
  if (words.length < size) return new Set([words.join(" ")]);
  const set = new Set<string>();
  for (let i = 0; i <= words.length - size; i++) {
    set.add(words.slice(i, i + size).join(" "));
  }
  return set;
}

function jaccardSimilarity(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersection = 0;
  for (const shingle of a) if (b.has(shingle)) intersection++;
  const union = a.size + b.size - intersection;
  return union === 0 ? 0 : intersection / union;
}

export type SimilarityMatch = {
  matchedSubmissionId: string;
  matchedUserId: string;
  similarity: number;
};

function extractJustification(content: unknown): string | null {
  const justification = (content as { justification?: unknown } | null)?.justification;
  return typeof justification === "string" ? justification : null;
}

/**
 * Compares a submission's free-text justification against every other
 * trainer's justification on the same task, and flags a near-duplicate as
 * a RiskFlag for human review.
 *
 * Scoped to the same task deliberately: two trainers independently landing
 * on similar wording across unrelated tasks is coincidence (or just a
 * common way to phrase a rubric-driven answer). Two trainers producing
 * near-identical prose on the *same* prompt — the same signal collusion or
 * copy-pasting produces — is what this is built to catch. This is
 * shingle-overlap similarity, not semantic similarity: it catches copying
 * and light paraphrasing, not two people independently reaching the same
 * conclusion in different words.
 */
export async function checkSubmissionSimilarity(params: {
  submissionId: string;
  taskId: string;
  submittedById: string;
  justification: string;
}): Promise<SimilarityMatch | null> {
  const words = normalize(params.justification);
  if (words.length < MIN_WORD_COUNT) return null;

  const others = await prisma.taskSubmission.findMany({
    where: { taskId: params.taskId, submittedById: { not: params.submittedById } },
    select: { id: true, submittedById: true, content: true },
  });
  if (others.length === 0) return null;

  const mine = shingles(words);
  let best: SimilarityMatch | null = null;

  for (const other of others) {
    const otherText = extractJustification(other.content);
    if (!otherText) continue;
    const otherWords = normalize(otherText);
    if (otherWords.length < MIN_WORD_COUNT) continue;

    const similarity = jaccardSimilarity(mine, shingles(otherWords));
    if (!best || similarity > best.similarity) {
      best = { matchedSubmissionId: other.id, matchedUserId: other.submittedById, similarity };
    }
  }

  if (!best || best.similarity < MEDIUM_SIMILARITY) return null;

  const severity = best.similarity >= HIGH_SIMILARITY ? "high" : "medium";

  await prisma.riskFlag.create({
    data: {
      userId: params.submittedById,
      signal: "plagiarism_suspected",
      severity,
      details: {
        submissionId: params.submissionId,
        matchedSubmissionId: best.matchedSubmissionId,
        matchedUserId: best.matchedUserId,
        taskId: params.taskId,
        similarity: Math.round(best.similarity * 1000) / 1000,
      },
    },
  });

  // A near-exact match is not a call for an ordinary peer reviewer — the
  // same trust problem that makes plagiarism worth detecting also makes a
  // peer a bad judge of it (they could be the colluding party, or just
  // unequipped to weigh a fraud signal). High-confidence matches go
  // straight to adjudication instead, which already enforces separation of
  // duties: the adjudicator can't be the submitter or a prior reviewer.
  // getReviewQueue excludes anything with an open adjudication, so this
  // takes the submission out of ordinary review entirely rather than
  // leaving it there alongside a warning banner.
  if (severity === "high") {
    await openAdjudication({ submissionId: params.submissionId, reason: "plagiarism_suspected" });
    await prisma.task.update({ where: { id: params.taskId }, data: { status: "ESCALATED" } });
  }

  return best;
}

/**
 * Whether a submission has an open plagiarism flag — used by the blind
 * review workspace to warn the reviewer without naming the matched
 * trainer, which would break the blind-review guarantee.
 */
export async function getOpenSimilarityFlag(submissionId: string) {
  const flags = await prisma.riskFlag.findMany({
    where: { signal: "plagiarism_suspected", status: "OPEN" },
    select: { id: true, severity: true, details: true },
  });
  const match = flags.find((f) => (f.details as { submissionId?: string } | null)?.submissionId === submissionId);
  if (!match) return null;

  const details = match.details as { similarity?: number };
  return { severity: match.severity, similarity: details.similarity ?? null };
}
