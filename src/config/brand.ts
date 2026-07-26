/**
 * Centralized brand configuration.
 * Swap these values to re-skin the entire platform (name, tagline, legal entity, support contacts).
 * Do not hard-code brand strings anywhere else in the app — import from here.
 */

export const brand = {
  name: "Traivr",
  shortName: "Traivr",
  tagline: "Human expertise for better AI.",
  // TODO: replace with the registered entity once incorporated. This appears
  // in the footer of every outbound email, so it should be a name someone
  // could actually look up.
  legalName: "Traivr",
  domain: "traivr.com",
  supportEmail: "support@traivr.com",
  salesEmail: "sales@traivr.com",
  demoDomain: "traivr.demo",
  // TODO: neither profile exists yet. Create them or drop the links — a
  // footer icon that 404s is worse than no icon.
  social: {
    linkedin: "https://www.linkedin.com/company/traivr",
    twitter: "https://x.com/traivr",
  },
} as const;

export type Brand = typeof brand;
