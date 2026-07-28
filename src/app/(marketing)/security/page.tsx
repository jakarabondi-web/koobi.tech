import type { Metadata } from "next";
import { Lock, KeyRound, FileClock, Building2, ShieldCheck, ServerCog, EyeOff, ClipboardCheck } from "lucide-react";

import { MarketingPageHero } from "@/components/marketing/page-hero";
import { FeatureBento, type FeatureBentoItem } from "@/components/marketing/feature-bento";

export const metadata: Metadata = { title: "Security" };

const CONTROLS: FeatureBentoItem[] = [
  {
    icon: <Lock className="size-6" />,
    title: "Role-based access control",
    desc: "Every permission enforced server-side, not just in the UI.",
    tag: "RBAC",
  },
  {
    icon: <KeyRound className="size-6" />,
    title: "Encryption in transit and at rest",
    desc: "Sensitive fields held under application-level encryption.",
    tag: "Encryption",
  },
  {
    icon: <FileClock className="size-6" />,
    title: "Audit logging",
    desc: "Approvals, payments, exports — logged with actor and timestamp.",
    tag: "Audit trail",
  },
  {
    icon: <Building2 className="size-6" />,
    title: "Project & tenant isolation",
    desc: "Each org's data and workforce isolated from every other.",
    tag: "Isolation",
  },
  {
    icon: <ShieldCheck className="size-6" />,
    title: "Secure task workspaces",
    desc: "Scoped to assigned, qualified workers only.",
    tag: "Workspace scoping",
  },
  {
    icon: <ServerCog className="size-6" />,
    title: "Data-retention controls",
    desc: "Configurable retention windows, defined deletion workflows.",
    tag: "Retention",
  },
  {
    icon: <EyeOff className="size-6" />,
    title: "Reviewer identity separation",
    desc: "Trainer identity withheld from reviewers by default.",
    tag: "Identity separation",
  },
  {
    icon: <ClipboardCheck className="size-6" />,
    title: "Designed for SOC 2 readiness",
    desc: "Built around SOC 2 Trust Services Criteria. Not yet certified.",
    tag: "SOC 2-aligned",
  },
];

export default function SecurityPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="Security"
        title="Security is a first-class product requirement"
        description="Enterprise AI teams trust Traivr with sensitive prompts, model outputs, and evaluation data. Here's how we protect it."
      />
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <FeatureBento items={CONTROLS} />
        </div>
      </section>
    </>
  );
}
