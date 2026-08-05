import type { Metadata } from "next";
import { Cpu, Workflow, Binary, Terminal, Database, Globe2, Code2, Fingerprint } from "lucide-react";

import { MarketingPageHero } from "@/components/marketing/page-hero";
import { FeatureBento, type FeatureBentoItem } from "@/components/marketing/feature-bento";

export const metadata: Metadata = {
  title: "Services",
  description:
    "Explore Traivr's AI training services — RLHF, supervised fine-tuning, model evaluations, red teaming, and expert data creation, run by verified specialists.",
};

const SERVICES: FeatureBentoItem[] = [
  {
    icon: <Cpu className="size-6" />,
    title: "RLHF & preference data",
    desc: "Bradley–Terry and Elo-style pairwise ranking. JSONL export, schema-validated against your training config.",
    tag: "Reward modeling",
  },
  {
    icon: <Terminal className="size-6" />,
    title: "Supervised fine-tuning data",
    desc: "Ideal-response and instruction-tuning prompts, authored to spec. Full version diffs, API-ready.",
    tag: "SFT",
  },
  {
    icon: <Workflow className="size-6" />,
    title: "Model evaluations",
    desc: "Single-response and rubric-scored evals against your harness — precision/recall reported per category.",
    tag: "Eval harness",
  },
  {
    icon: <Binary className="size-6" />,
    title: "Red teaming",
    desc: "Adversarial probes across OWASP LLM01–LLM10, severity-tagged and exported to your tracker.",
    tag: "OWASP LLM Top 10",
  },
  {
    icon: <Database className="size-6" />,
    title: "Expert data creation",
    desc: "Original problems, references, and worked solutions — versioned, license-cleared, ready for training or eval sets.",
    tag: "Dataset authoring",
  },
  {
    icon: <Globe2 className="size-6" />,
    title: "Multilingual evaluation",
    desc: "Native-fluency review across 30+ languages and locale variants, confidence-scored per item.",
    tag: "i18n / L10n",
  },
  {
    icon: <Code2 className="size-6" />,
    title: "Code & reasoning tasks",
    desc: "Code review, test-case evaluation, and multi-step reasoning checks. Diffs and pass/fail exported per case.",
    tag: "SWE-bench style",
  },
  {
    icon: <Fingerprint className="size-6" />,
    title: "Safety & policy testing",
    desc: "Safety and policy classification, hallucination detection — rubric-scored, false-positive rate reported.",
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
          <FeatureBento items={SERVICES} />
        </div>
      </section>
    </>
  );
}
