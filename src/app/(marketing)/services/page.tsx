import type { Metadata } from "next";
import { GitCompareArrows, Wand2, Radar, ShieldAlert, BookOpenText, Languages, Code2, FlaskConical } from "lucide-react";

import { MarketingPageHero } from "@/components/marketing/page-hero";
import { FeatureBento } from "@/components/marketing/feature-bento";

export const metadata: Metadata = { title: "Services" };

const SERVICES = [
  {
    icon: GitCompareArrows,
    title: "RLHF & preference data",
    desc: "Bradley-Terry pairwise comparisons and multi-response ranking, with configurable confidence scoring, feed directly into reward-model training.",
    tag: "Reward modeling",
  },
  {
    icon: Wand2,
    title: "Supervised fine-tuning data",
    desc: "Domain experts write ideal responses and instruction-tuning prompts to targeted specifications, with full version history.",
    tag: "SFT",
  },
  {
    icon: Radar,
    title: "Model evaluations",
    desc: "Single-response and rubric-based scoring across correctness, relevance, completeness, and tone.",
    tag: "Eval harness",
  },
  {
    icon: ShieldAlert,
    title: "Red teaming",
    desc: "Structured adversarial testing mapped to the OWASP LLM Top 10 and your safety and policy boundaries.",
    tag: "OWASP LLM Top 10",
  },
  {
    icon: BookOpenText,
    title: "Expert data creation",
    desc: "Original datasets — problems, references, worked solutions — authored by verified domain professionals.",
    tag: "Dataset authoring",
  },
  {
    icon: Languages,
    title: "Multilingual evaluation",
    desc: "Native and near-native fluency review across dozens of languages and regional variants.",
    tag: "i18n / L10n",
  },
  {
    icon: Code2,
    title: "Code & reasoning tasks",
    desc: "Code review, output evaluation against test cases, and multi-step reasoning verification.",
    tag: "SWE-bench style",
  },
  {
    icon: FlaskConical,
    title: "Safety & policy testing",
    desc: "Safety classification, policy classification, and hallucination detection against your rubric.",
    tag: "Trust & safety",
  },
];

export default function ServicesPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="Services"
        title="One platform for the full data pipeline"
        description="Every workflow needed to take a model from raw capability to production-ready, human-verified behavior."
      />
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FeatureBento items={SERVICES} featured={false} />
        </div>
      </section>
    </>
  );
}
