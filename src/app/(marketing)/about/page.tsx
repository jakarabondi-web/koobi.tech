import type { Metadata } from "next";

import { brand } from "@/config/brand";
import { MarketingPageHero } from "@/components/marketing/page-hero";

export const metadata: Metadata = {
  title: "About",
  description:
    "Traivr connects AI companies with a verified global network of subject-matter experts for RLHF, evaluations, red teaming, and data creation.",
};

export default function AboutPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="About"
        title={`${brand.name} exists to make AI training data trustworthy`}
        description="We believe the next generation of AI systems will be built and evaluated by people, not just pipelines."
      />
      <section className="py-16">
        <div className="mx-auto max-w-3xl space-y-6 px-4 text-muted-foreground sm:px-6 lg:px-8">
          <p>
            {brand.name} connects AI companies with a verified network of trainers, subject-matter experts,
            reviewers, and adjudicators who create and evaluate the human data that shapes model behavior.
          </p>
          <p>
            We started from a simple observation: as models get more capable, the quality of the humans in the loop
            matters more, not less. Every workflow on the platform — from qualification testing to multi-stage
            review to consensus scoring — exists to keep that human signal reliable.
          </p>
          <p>
            Our team combines backgrounds in applied AI, operations, and trust & safety. We&apos;re building the
            infrastructure we&apos;d want to use ourselves.
          </p>
        </div>
      </section>
    </>
  );
}
