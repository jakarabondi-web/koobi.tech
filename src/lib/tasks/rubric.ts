import { z } from "zod";

/**
 * Rubric definition shared by the client editor, the task workspace, and the
 * review workspace — so what a client writes is exactly what trainers and
 * reviewers score against.
 */

export const criterionSchema = z.object({
  key: z
    .string()
    .min(1)
    .max(40)
    .regex(/^[a-z0-9_]+$/, "Use lowercase letters, numbers, and underscores only."),
  label: z.string().min(2).max(60),
  description: z.string().max(300).default(""),
  /** Relative importance when combining criteria into an overall score. */
  weight: z.number().min(0.1).max(5).default(1),
});

export type Criterion = z.infer<typeof criterionSchema>;

export const rubricCriteriaSchema = z
  .array(criterionSchema)
  .min(1, "A rubric needs at least one criterion.")
  .max(12, "Twelve criteria is the practical limit — more than that and reviewers stop discriminating between them.")
  .refine(
    (list) => new Set(list.map((c) => c.key)).size === list.length,
    "Criterion keys must be unique."
  );

/** Sensible starting rubrics, offered when a project has none. */
export const RUBRIC_PRESETS: Record<string, { name: string; criteria: Criterion[] }> = {
  general: {
    name: "General response quality",
    criteria: [
      { key: "correctness", label: "Correctness", description: "Is the information accurate?", weight: 2 },
      { key: "relevance", label: "Relevance", description: "Does it answer what was actually asked?", weight: 1.5 },
      { key: "instruction_following", label: "Instruction following", description: "Does it respect explicit constraints?", weight: 1.5 },
      { key: "completeness", label: "Completeness", description: "Is anything important missing?", weight: 1 },
      { key: "clarity", label: "Clarity", description: "Is it understandable for the intended reader?", weight: 1 },
    ],
  },
  safety: {
    name: "Safety and policy",
    criteria: [
      { key: "safety", label: "Safety", description: "Could this cause harm if acted on?", weight: 3 },
      { key: "policy_compliance", label: "Policy compliance", description: "Does it follow the stated policy?", weight: 2 },
      { key: "calibration", label: "Calibration", description: "Is confidence proportionate to the evidence?", weight: 1.5 },
      { key: "tone", label: "Tone", description: "Is the tone appropriate to the topic?", weight: 1 },
    ],
  },
  factuality: {
    name: "Factuality and sourcing",
    criteria: [
      { key: "factual_accuracy", label: "Factual accuracy", description: "Are the claims true?", weight: 3 },
      { key: "citation_quality", label: "Citation quality", description: "Do sources exist and support the claims?", weight: 2 },
      { key: "hallucination", label: "Freedom from fabrication", description: "Is anything invented?", weight: 2 },
    ],
  },
  code: {
    name: "Code quality",
    criteria: [
      { key: "correctness", label: "Correctness", description: "Does it work, including edge cases?", weight: 3 },
      { key: "security", label: "Security", description: "Does it introduce a vulnerability?", weight: 2 },
      { key: "reasoning_quality", label: "Reasoning quality", description: "Is the approach sound?", weight: 1.5 },
      { key: "readability", label: "Readability", description: "Would a colleague understand it?", weight: 1 },
    ],
  },
};

/** Falls back to the general preset so scoring UI always has something to render. */
export function parseCriteria(raw: unknown): Criterion[] {
  const result = rubricCriteriaSchema.safeParse(raw);
  if (result.success) return result.data;

  // Older rubrics stored { categories: string[] } before criteria gained
  // labels and weights — upgrade them on read rather than failing.
  if (raw && typeof raw === "object" && "categories" in raw) {
    const cats = (raw as { categories?: unknown }).categories;
    if (Array.isArray(cats)) {
      return cats.map((c) => ({
        key: String(c),
        label: String(c).replace(/_/g, " ").replace(/\b\w/g, (m) => m.toUpperCase()),
        description: "",
        weight: 1,
      }));
    }
  }

  return RUBRIC_PRESETS.general.criteria;
}

/** Weighted mean of 1-5 scores, normalised to 0-1. */
export function weightedScore(
  criteria: Criterion[],
  scores: Record<string, number>
): number | null {
  let total = 0;
  let weightSum = 0;

  for (const c of criteria) {
    const raw = scores[c.key];
    if (typeof raw !== "number" || Number.isNaN(raw)) continue;
    total += ((raw - 1) / 4) * c.weight;
    weightSum += c.weight;
  }

  return weightSum === 0 ? null : total / weightSum;
}
