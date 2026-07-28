import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Cpu, Workflow, Binary, Terminal } from "lucide-react";

import { MarketingPageHero } from "@/components/marketing/page-hero";
import { Button } from "@/components/ui/button";
import { FeatureBento, type FeatureBentoItem } from "@/components/marketing/feature-bento";

export const metadata: Metadata = { title: "For AI companies" };

const USE_CASES: FeatureBentoItem[] = [
  {
    title: "RLHF & preference data",
    desc: "Bradley–Terry and Elo-style pairwise ranking. JSONL export, schema-validated against your training config.",
    icon: <Cpu className="size-6" />,
    tag: "Reward modeling",
  },
  {
    title: "Model evaluation",
    desc: "Rubric-scored evals against your harness — precision/recall reported per category, not just an aggregate score.",
    icon: <Workflow className="size-6" />,
    tag: "Eval harness",
  },
  {
    title: "Red teaming",
    desc: "Adversarial probes across OWASP LLM01–LLM10, severity-tagged and exported to your tracker.",
    icon: <Binary className="size-6" />,
    tag: "OWASP LLM Top 10",
  },
  {
    title: "SFT data creation",
    desc: "Ideal-response and prompt authoring with schema validation and full version diffs, API-ready.",
    icon: <Terminal className="size-6" />,
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
