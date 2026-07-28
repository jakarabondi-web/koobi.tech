import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, GitCompareArrows, Radar, ShieldAlert, Wand2 } from "lucide-react";

import { MarketingPageHero } from "@/components/marketing/page-hero";
import { Button } from "@/components/ui/button";
import { FeatureBento } from "@/components/marketing/feature-bento";

export const metadata: Metadata = { title: "For AI companies" };

const USE_CASES = [
  {
    title: "RLHF & preference data",
    desc: "Bradley-Terry pairwise comparisons and multi-response ranking, exported in the schema your reward-model training pipeline already expects.",
    icon: GitCompareArrows,
    tag: "Reward modeling",
  },
  {
    title: "Model evaluation",
    desc: "Rubric-based scoring across correctness, safety, and tone — aligned to your own eval harness, not a black-box grade.",
    icon: Radar,
    tag: "Eval harness",
  },
  {
    title: "Red teaming",
    desc: "Adversarial probing mapped to the OWASP LLM Top 10 and your internal policy boundaries.",
    icon: ShieldAlert,
    tag: "OWASP LLM Top 10",
  },
  {
    title: "SFT data creation",
    desc: "Ideal-response writing and instruction-tuning prompts authored by vetted subject-matter experts.",
    icon: Wand2,
    tag: "Instruction tuning",
  },
];

const STATS = [
  { label: "Verified specialists", value: "340+" },
  { label: "Domains covered", value: "25+" },
  { label: "Median match time", value: "< 48 hrs" },
  { label: "Avg. reviewer agreement", value: "94%" },
];

export default function ForCompaniesPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="For AI companies"
        title="Enterprise-grade human data infrastructure"
        description="Launch evaluation, RLHF, and red-teaming projects with verified experts — and keep full visibility into quality, cost, and delivery."
      />

      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-4">
            {STATS.map((s) => (
              <div key={s.label} className="rounded-xl border border-border bg-card p-5 text-center">
                <p className="text-2xl font-semibold tracking-tight">{s.value}</p>
                <p className="mt-1 text-xs text-muted-foreground">{s.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-y border-border bg-surface py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight">What teams build with Traivr</h2>
          <div className="mt-8">
            <FeatureBento items={USE_CASES} />
          </div>
        </div>
      </section>

      <section className="py-16 text-center">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight">Ready to scope a project?</h2>
          <p className="mt-3 text-muted-foreground">
            Tell us about your model, your evaluation needs, and your timeline — we&apos;ll follow up with a tailored
            plan.
          </p>
          <Button size="lg" variant="violet" className="mt-6" asChild>
            <Link href="/contact">
              Book a demo <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
