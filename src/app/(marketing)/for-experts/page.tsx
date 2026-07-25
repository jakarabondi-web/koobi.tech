import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Wallet, Clock, LineChart, MessageCircle } from "lucide-react";

import { MarketingPageHero } from "@/components/marketing/page-hero";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "For experts" };

const BENEFITS = [
  { icon: Wallet, title: "Transparent, upfront pay", desc: "Every project shows exact compensation before you accept it." },
  { icon: Clock, title: "Work on your schedule", desc: "Pick up projects that fit your availability — no fixed shifts." },
  { icon: LineChart, title: "Quality that pays off", desc: "Consistent, high-quality work unlocks better projects and bonuses." },
  { icon: MessageCircle, title: "Real feedback", desc: "Senior reviewers explain exactly what to improve, task by task." },
];

export default function ForExpertsPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="For experts"
        title="Get paid to improve the world's most advanced AI systems"
        description="Join a network of software engineers, scientists, medical and legal professionals, linguists, and researchers doing meaningful AI-training work."
      />
      <section className="py-16">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {BENEFITS.map((b) => (
              <div key={b.title} className="rounded-xl border border-border bg-card p-5">
                <b.icon className="size-5 text-primary" />
                <h3 className="mt-3 text-sm font-semibold">{b.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{b.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      <section className="border-t border-border bg-surface py-16 text-center">
        <div className="mx-auto max-w-2xl px-4 sm:px-6 lg:px-8">
          <h2 className="text-2xl font-semibold tracking-tight">Start your application</h2>
          <p className="mt-3 text-muted-foreground">
            Applications take about 20 minutes and include a short qualification assessment in your area of
            expertise.
          </p>
          <Button size="lg" variant="violet" className="mt-6" asChild>
            <Link href="/apply">
              Apply now <ArrowRight className="size-4" />
            </Link>
          </Button>
        </div>
      </section>
    </>
  );
}
