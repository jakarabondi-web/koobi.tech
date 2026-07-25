import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, CheckCircle2 } from "lucide-react";

import { MarketingPageHero } from "@/components/marketing/page-hero";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Apply as an expert" };

const STEPS = [
  "Create your account and verify your email",
  "Tell us about your background, skills, and languages",
  "Take a short qualification assessment in your area of expertise",
  "Get matched to available projects once approved",
];

export default function ApplyPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="Apply as an expert"
        title="Join the Trainora AI expert network"
        description="Applications take about 20 minutes. We review every application and follow up within a few business days."
      />
      <section className="py-16">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <ol className="space-y-4">
            {STEPS.map((s, i) => (
              <li key={s} className="flex items-start gap-3 rounded-xl border border-border bg-card p-4">
                <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-foreground">
                  {i + 1}
                </span>
                <p className="text-sm">{s}</p>
              </li>
            ))}
          </ol>
          <div className="mt-8 flex items-center gap-2 text-sm text-muted-foreground">
            <CheckCircle2 className="size-4 text-success" />
            No cost to apply. You&apos;ll see project pay rates before you start any task.
          </div>
          <Button size="lg" variant="violet" className="mt-6 w-full sm:w-auto" asChild>
            <Link href="/register?role=trainer">
              Start your application <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
