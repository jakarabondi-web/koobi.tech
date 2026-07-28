import {
  GitCompareArrows, Radar, ShieldAlert, Wand2,
  Network, ScanSearch, Siren, Sparkles,
  Cpu, Workflow, Binary, Terminal,
} from "lucide-react";

import { FeatureBento, type FeatureBentoItem } from "@/components/marketing/feature-bento";

const SET_1: FeatureBentoItem[] = [
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

const SET_2: FeatureBentoItem[] = [
  {
    title: "RLHF & preference data",
    desc: "Cut reward-model iteration time by pairing every comparison with an inter-rater agreement score, so noisy labels get caught before training, not after.",
    icon: Network,
    tag: "Reward modeling",
  },
  {
    title: "Model evaluation",
    desc: "Continuous evaluation against your rubric — regressions surface within 24 hours, not at the next release cut.",
    icon: ScanSearch,
    tag: "Eval harness",
  },
  {
    title: "Red teaming",
    desc: "Coverage tracked against the OWASP LLM Top 10 checklist, with a closed-loop remediation queue for every finding.",
    icon: Siren,
    tag: "OWASP LLM Top 10",
  },
  {
    title: "SFT data creation",
    desc: "Ideal-response authoring with full diff history — every revision traceable back to the expert who made it.",
    icon: Sparkles,
    tag: "Instruction tuning",
  },
];

const SET_3: FeatureBentoItem[] = [
  {
    title: "RLHF & preference data",
    desc: "Bradley–Terry and Elo-style pairwise ranking. JSONL export, schema-validated against your training config.",
    icon: Cpu,
    tag: "Reward modeling",
  },
  {
    title: "Model evaluation",
    desc: "Rubric-scored evals against your harness — precision/recall reported per category, not just an aggregate score.",
    icon: Workflow,
    tag: "Eval harness",
  },
  {
    title: "Red teaming",
    desc: "Adversarial probes across OWASP LLM01–LLM10, severity-tagged and exported to your tracker.",
    icon: Binary,
    tag: "OWASP LLM Top 10",
  },
  {
    title: "SFT data creation",
    desc: "Ideal-response and prompt authoring with schema validation and full version diffs, API-ready.",
    icon: Terminal,
    tag: "Instruction tuning",
  },
];

export default function CopyPreviewPage() {
  return (
    <div className="space-y-12 bg-background p-8">
      <div>
        <p className="mb-4 text-sm font-semibold text-muted-foreground">Set 1 — Standards-referenced (Bradley-Terry, OWASP)</p>
        <FeatureBento items={SET_1} />
      </div>
      <div>
        <p className="mb-4 text-sm font-semibold text-muted-foreground">Set 2 — Outcome-focused (what it gets you)</p>
        <FeatureBento items={SET_2} />
      </div>
      <div>
        <p className="mb-4 text-sm font-semibold text-muted-foreground">Set 3 — Engineering-spec terse</p>
        <FeatureBento items={SET_3} />
      </div>
    </div>
  );
}
