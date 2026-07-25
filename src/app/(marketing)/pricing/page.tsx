import Link from "next/link";
import type { Metadata } from "next";
import { CheckCircle2 } from "lucide-react";

import { MarketingPageHero } from "@/components/marketing/page-hero";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export const metadata: Metadata = { title: "Pricing" };

const TIERS = [
  {
    name: "Pilot",
    price: "Custom",
    desc: "For teams validating a use case with a small, well-scoped dataset.",
    features: ["Up to 2 active projects", "Standard quality review", "Email support", "Self-serve project setup"],
  },
  {
    name: "Scale",
    price: "Custom",
    desc: "For teams running ongoing evaluation, RLHF, or SFT pipelines.",
    features: ["Unlimited projects", "Multi-stage review & adjudication", "Dedicated onboarding", "API access & webhooks"],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    desc: "For organizations with advanced security, volume, or compliance needs.",
    features: ["Custom security review", "SSO-ready architecture", "Dedicated operations manager", "Custom SLAs"],
  },
];

export default function PricingPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="Pricing"
        title="Pricing that scales with your data needs"
        description="Every engagement is scoped to your task type, volume, and quality bar. Talk to our team for a tailored quote."
      />
      <section className="py-16">
        <div className="mx-auto grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
          {TIERS.map((t) => (
            <Card key={t.name} className={t.highlighted ? "border-primary shadow-md" : undefined}>
              <CardHeader>
                <CardTitle className="text-base">{t.name}</CardTitle>
                <p className="text-2xl font-semibold">{t.price}</p>
                <p className="text-sm text-muted-foreground">{t.desc}</p>
              </CardHeader>
              <CardContent className="pb-6">
                <ul className="space-y-2">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                      {f}
                    </li>
                  ))}
                </ul>
                <Button className="mt-6 w-full" variant={t.highlighted ? "violet" : "outline"} asChild>
                  <Link href="/contact">Talk to sales</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>
    </>
  );
}
