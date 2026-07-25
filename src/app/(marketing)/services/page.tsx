import type { Metadata } from "next";
import {
  GitCompareArrows, PenLine, ScanEye, ShieldCheck, BookOpenText, Languages, Code2, FlaskConical,
} from "lucide-react";

import { MarketingPageHero } from "@/components/marketing/page-hero";
import { Card, CardContent } from "@/components/ui/card";

export const metadata: Metadata = { title: "Services" };

const SERVICES = [
  { icon: GitCompareArrows, title: "RLHF & preference data", desc: "Pairwise comparison and multi-response ranking tasks, with configurable confidence scoring, feed directly into reward-model training." },
  { icon: PenLine, title: "Supervised fine-tuning data", desc: "Domain experts write ideal responses and prompts to targeted specifications, with full version history." },
  { icon: ScanEye, title: "Model evaluations", desc: "Single-response and rubric-based scoring across correctness, relevance, completeness, and tone." },
  { icon: ShieldCheck, title: "Red teaming", desc: "Structured adversarial testing against your safety and policy boundaries, run by trained specialists." },
  { icon: BookOpenText, title: "Expert data creation", desc: "Original datasets — problems, references, worked solutions — authored by verified domain professionals." },
  { icon: Languages, title: "Multilingual evaluation", desc: "Native and near-native fluency review across dozens of languages and regional variants." },
  { icon: Code2, title: "Code & reasoning tasks", desc: "Code review, output evaluation against test cases, and multi-step reasoning verification." },
  { icon: FlaskConical, title: "Safety & policy testing", desc: "Safety classification, policy classification, and hallucination detection against your rubric." },
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
          <div className="grid gap-4 sm:grid-cols-2">
            {SERVICES.map((s) => (
              <Card key={s.title}>
                <CardContent className="flex items-start gap-3 pt-1 pb-5">
                  <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <s.icon className="size-4.5" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
