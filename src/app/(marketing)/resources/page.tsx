import type { Metadata } from "next";
import { FileText, BookOpen, Newspaper } from "lucide-react";

import { MarketingPageHero } from "@/components/marketing/page-hero";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Resources" };

const RESOURCES = [
  { icon: BookOpen, category: "Guide", title: "Designing a rubric for RLHF preference data", desc: "How to structure scoring categories so reviewers and models agree." },
  { icon: FileText, category: "Playbook", title: "Running a red-team project end to end", desc: "From scoping adversarial goals to adjudicating edge cases." },
  { icon: Newspaper, category: "Report", title: "The state of human evaluation in 2026", desc: "Trends in reviewer agreement, task design, and dataset quality." },
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
          <div className="grid gap-4 sm:grid-cols-3">
            {RESOURCES.map((r) => (
              <Card key={r.title}>
                <CardContent className="pt-1 pb-5">
                  <r.icon className="size-5 text-primary" />
                  <p className="mt-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">{r.category}</p>
                  <h3 className="mt-1 text-sm font-semibold">{r.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{r.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
