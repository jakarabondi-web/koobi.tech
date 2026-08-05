import type { Metadata } from "next";
import { BookOpen, FileText, Newspaper } from "lucide-react";

import { MarketingPageHero } from "@/components/marketing/page-hero";
import { FeatureBento, type FeatureBentoItem } from "@/components/marketing/feature-bento";

export const metadata: Metadata = {
  title: "Resources",
  description:
    "Guides and resources on human-in-the-loop AI training — RLHF, model evaluation, red teaming, and building high-quality training datasets with Traivr.",
};

const RESOURCES: FeatureBentoItem[] = [
  {
    icon: <BookOpen className="size-6" />,
    tag: "Guide",
    title: "Designing a rubric for RLHF preference data",
    desc: "How to structure scoring categories so reviewers and models agree.",
  },
  {
    icon: <FileText className="size-6" />,
    tag: "Playbook",
    title: "Running a red-team project end to end",
    desc: "From scoping adversarial goals to adjudicating edge cases.",
  },
  {
    icon: <Newspaper className="size-6" />,
    tag: "Report",
    title: "The state of human evaluation in 2026",
    desc: "Trends in reviewer agreement, task design, and dataset quality.",
  },
];

export default function ResourcesPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="Resources"
        title="Guides and playbooks for AI data teams"
        description="Practical guidance from our operations and quality teams on running high-quality human-in-the-loop pipelines."
      />
      <section className="py-16">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <FeatureBento items={RESOURCES} columns={3} />
        </div>
      </section>
    </>
  );
}
