import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { MarketingPageHero } from "@/components/marketing/page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "For AI companies" };

const USE_CASES = [
  { title: "RLHF & preference data", desc: "Collect calibrated pairwise and ranked preference data to train reward models." },
  { title: "Model evaluation", desc: "Score model outputs against your rubric across correctness, safety, and tone." },
  { title: "Red teaming", desc: "Adversarial testing to surface failure modes before your users do." },
  { title: "SFT data creation", desc: "Ideal-response writing and prompt generation from subject-matter experts." },
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
          <div className="mt-8 grid gap-4 sm:grid-cols-2">
            {USE_CASES.map((u) => (
              <Card key={u.title} className="h-full">
                {/* items-center (not items-start) so the icon centers against
                    the text block instead of pinning to its first line — and
                    h-full + flex-1 on the content so a two-line description
                    next to a one-line one doesn't leave the shorter card's
                    text stranded near the top with dead space below it. */}
                <CardContent className="flex h-full items-center gap-3 py-5">
                  <CheckCircle2 className="size-5 shrink-0 text-success" />
                  <div>
                    <h3 className="text-sm font-semibold">{u.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{u.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
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
