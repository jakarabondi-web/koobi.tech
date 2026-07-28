/**
 * Shared icon-badge color palette — four distinct hues, no pink or
 * high-chroma novelty colors, reused everywhere an icon sits in a tinted
 * badge (FeatureBento cards, the client-steps flow, expert-category chips,
 * the registration stepper).
 *
 * Deliberately NOT exported from a "use client" component file: a plain
 * value (not a component) exported from a client module and imported into
 * a Server Component crosses the RSC client-reference boundary and resolves
 * to an unusable proxy rather than the real array — the array needs its own
 * plain module so both server and client components can import it safely.
 */
export const ICON_BADGE_COLORS = [
  "text-primary bg-primary/10",
  "text-accent-violet bg-accent-violet/10",
  "text-accent-teal bg-accent-teal/10",
  "text-accent-amber bg-accent-amber/10",
];
