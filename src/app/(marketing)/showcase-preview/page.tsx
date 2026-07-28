"use client";

import { GitCompareArrows, ScanEye, ShieldCheck, PenLine } from "lucide-react";

import {
  ShowcaseBento,
  ShowcaseEditorial,
  ShowcaseSplit,
  type ShowcaseItem,
} from "@/components/marketing/usecase-showcase-options";

const ITEMS: ShowcaseItem[] = [
  {
    title: "RLHF & preference data",
    desc: "Collect calibrated pairwise and ranked preference data to train reward models.",
    icon: GitCompareArrows,
    tag: "Reward modeling",
  },
  {
    title: "Model evaluation",
    desc: "Score model outputs against your rubric across correctness, safety, and tone.",
    icon: ScanEye,
    tag: "Evaluation",
  },
  {
    title: "Red teaming",
    desc: "Adversarial testing to surface failure modes before your users do.",
    icon: ShieldCheck,
    tag: "Safety",
  },
  {
    title: "SFT data creation",
    desc: "Ideal-response writing and prompt generation from subject-matter experts.",
    icon: PenLine,
    tag: "Fine-tuning",
  },
];

export default function ShowcasePreviewPage() {
  return (
    <div className="space-y-16 bg-background p-8">
      <div>
        <p className="mb-4 text-sm font-semibold text-muted-foreground">Option A — Premium bento grid</p>
        <ShowcaseBento items={ITEMS} />
      </div>
      <div>
        <p className="mb-4 text-sm font-semibold text-muted-foreground">Option B — Editorial index list</p>
        <ShowcaseEditorial items={ITEMS} />
      </div>
      <div>
        <p className="mb-4 text-sm font-semibold text-muted-foreground">Option C — Interactive split showcase</p>
        <ShowcaseSplit items={ITEMS} />
      </div>
    </div>
  );
}
