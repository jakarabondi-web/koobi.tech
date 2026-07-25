import type { Metadata } from "next";
import { Lock, KeyRound, FileClock, Building2, ShieldCheck, CheckCircle2, ServerCog, EyeOff } from "lucide-react";

import { MarketingPageHero } from "@/components/marketing/page-hero";

export const metadata: Metadata = { title: "Security" };

const CONTROLS = [
  { icon: Lock, title: "Role-based access control", desc: "Every permission is enforced server-side across trainer, client, and admin surfaces — never in the UI alone." },
  { icon: KeyRound, title: "Encryption in transit and at rest", desc: "All traffic is encrypted, with sensitive fields held under application-level encryption." },
  { icon: FileClock, title: "Audit logging", desc: "Sensitive actions — approvals, payments, data exports — are logged with actor, target, and timestamp." },
  { icon: Building2, title: "Project & tenant isolation", desc: "Each client organization's data, datasets, and workforce are isolated from every other organization." },
  { icon: ShieldCheck, title: "Secure task workspaces", desc: "Task content is scoped to assigned, qualified workers, with no incidental exposure to other projects." },
  { icon: ServerCog, title: "Data-retention controls", desc: "Configurable retention windows per project, with defined deletion workflows." },
  { icon: EyeOff, title: "Reviewer identity separation", desc: "Reviewers see only what they're authorized to see — trainer identity is withheld by default." },
  { icon: CheckCircle2, title: "Designed for SOC 2 readiness", desc: "Our control environment is built around SOC 2 Trust Services Criteria as we pursue formal certification. We do not yet hold SOC 2 certification." },
];

export default function SecurityPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="Security"
        title="Security is a first-class product requirement"
        description="Enterprise AI teams trust Trainora AI with sensitive prompts, model outputs, and evaluation data. Here's how we protect it."
      />
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CONTROLS.map((c) => (
              <div key={c.title} className="rounded-xl border border-border bg-card p-5">
                <c.icon className="size-5 text-primary" />
                <h3 className="mt-3 text-sm font-semibold">{c.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{c.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
