/**
 * Inter-annotator agreement metrics.
 *
 * Raw percentage agreement overstates reliability because it ignores
 * agreement that would occur by chance — with two labels, two random raters
 * already agree 50% of the time. These metrics correct for that.
 */

export type Rating = { itemId: string; raterId: string; value: string };

/**
 * Krippendorff's alpha (nominal data).
 *
 * Preferred over Cohen's/Fleiss' kappa here because it tolerates any number
 * of raters and missing ratings — which is the normal case when tasks are
 * distributed across a rotating pool rather than rated by a fixed panel.
 *
 * Returns null when there is not enough overlap to compute a value.
 * Interpretation: >= 0.80 reliable, 0.67-0.80 tentative, below that the
 * rubric is usually the problem rather than the raters.
 */
export function krippendorffAlpha(ratings: Rating[]): number | null {
  const byItem = new Map<string, string[]>();
  for (const r of ratings) {
    const list = byItem.get(r.itemId) ?? [];
    list.push(r.value);
    byItem.set(r.itemId, list);
  }

  // Only items rated more than once carry information about agreement.
  const units = [...byItem.values()].filter((v) => v.length >= 2);
  if (units.length === 0) return null;

  const totalPairable = units.reduce((sum, u) => sum + u.length, 0);
  if (totalPairable < 2) return null;

  // Observed disagreement: within each unit, the proportion of rater pairs
  // that disagree, weighted by how many pairs the unit contributes.
  let observedDisagreement = 0;
  for (const values of units) {
    const m = values.length;
    let disagreeingPairs = 0;
    for (let i = 0; i < m; i++) {
      for (let j = i + 1; j < m; j++) {
        if (values[i] !== values[j]) disagreeingPairs++;
      }
    }
    observedDisagreement += (2 * disagreeingPairs) / (m - 1);
  }
  observedDisagreement /= totalPairable;

  // Expected disagreement: the rate two labels drawn at random from the
  // overall pool (without replacement) would differ.
  const counts = new Map<string, number>();
  for (const values of units) {
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
  }

  let sameLabelPairs = 0;
  for (const c of counts.values()) sameLabelPairs += c * (c - 1);
  const allPairs = totalPairable * (totalPairable - 1);
  if (allPairs === 0) return null;

  const expectedDisagreement = 1 - sameLabelPairs / allPairs;
  if (expectedDisagreement === 0) return 1; // everyone used one label and agreed

  return 1 - observedDisagreement / expectedDisagreement;
}

/** Fraction of ratings matching the item's modal label, averaged over items. */
export function majorityAgreement(ratings: Rating[]): number | null {
  const byItem = new Map<string, string[]>();
  for (const r of ratings) {
    const list = byItem.get(r.itemId) ?? [];
    list.push(r.value);
    byItem.set(r.itemId, list);
  }

  const units = [...byItem.values()].filter((v) => v.length >= 2);
  if (units.length === 0) return null;

  let total = 0;
  for (const values of units) {
    const counts = new Map<string, number>();
    for (const v of values) counts.set(v, (counts.get(v) ?? 0) + 1);
    total += Math.max(...counts.values()) / values.length;
  }
  return total / units.length;
}

export type AgreementBand = "reliable" | "tentative" | "unreliable";

export function bandFor(alpha: number | null): AgreementBand | null {
  if (alpha === null) return null;
  if (alpha >= 0.8) return "reliable";
  if (alpha >= 0.667) return "tentative";
  return "unreliable";
}
