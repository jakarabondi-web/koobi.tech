import Link from "next/link";
import type { Metadata } from "next";
import { ArrowRight, Wallet, Clock, LineChart, MessageCircle } from "lucide-react";

import { MarketingPageHero } from "@/components/marketing/page-hero";
import { Button } from "@/components/ui/button";
import { FeatureBento, type FeatureBentoItem } from "@/components/marketing/feature-bento";

export const metadata: Metadata = { title: "For experts" };

const BENEFITS: FeatureBentoItem[] = [
  {
    icon: <Wallet className="size-6" />,
    title: "Transparent, upfront pay",
    desc: "Exact compensation shown before you accept any project.",
    tag: "Pay transparency",
  },
  {
    icon: <Clock className="size-6" />,
    title: "Work on your schedule",
    desc: "Pick up projects that fit your availability, no fixed shifts.",
    tag: "Flexible scheduling",
  },
  {
    icon: <LineChart className="size-6" />,
    title: "Quality that pays off",
    desc: "Consistent quality unlocks better projects and bonuses.",
    tag: "Quality bonuses",
  },
  {
    icon: <MessageCircle className="size-6" />,
    title: "Real feedback",
    desc: "Senior reviewers explain what to improve, task by task.",
    tag: "Reviewer feedback",
  },
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
          <FeatureBento items={BENEFITS} />
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
