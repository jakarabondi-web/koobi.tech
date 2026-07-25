/**
 * Centralized brand configuration.
 * Swap these values to re-skin the entire platform (name, tagline, legal entity, support contacts).
 * Do not hard-code brand strings anywhere else in the app — import from here.
 */

export const brand = {
  name: "Trainora AI",
  shortName: "Trainora",
  tagline: "Human expertise for better AI.",
  legalName: "Trainora AI, Inc.",
  domain: "trainora.ai",
  supportEmail: "support@trainora.ai",
  salesEmail: "sales@trainora.ai",
  demoDomain: "trainora.demo",
  social: {
    linkedin: "https://www.linkedin.com/company/trainora-ai",
    twitter: "https://x.com/trainoraai",
  },
} as const;

export type Brand = typeof brand;
