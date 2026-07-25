import Link from "next/link";
import { Gauge, Globe2, ShieldCheck, UserRoundCheck } from "lucide-react";

import { ExpertNetworkGraphic } from "@/components/marketing/expert-network-graphic";
import { Button } from "@/components/ui/button";
import { heroHighlights } from "@/lib/mock-data";

const HIGHLIGHT_ICONS = {
  verified: UserRoundCheck,
  quality: Gauge,
  security: ShieldCheck,
  scale: Globe2,
} as const;

export function Hero() {
  return (
    <section className="mx-auto w-full max-w-content px-4 pb-16 pt-12 sm:px-6 lg:pb-24 lg:pt-20">
      <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-8">
        <div>
          <p className="inline-flex items-center rounded-full border border-border bg-background px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.12em] text-secondary shadow-sm">
            The human intelligence layer for&nbsp;
            <span className="text-amber-500">AI</span>
          </p>

          <h1 className="mt-6 text-4xl font-bold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            The right experts make better AI possible.
          </h1>

          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted-foreground">
            Trainora AI connects leading AI teams with verified professionals who
            create, evaluate, and improve the data that powers frontier models.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link href="#contact">
              <Button size="lg">Start a project</Button>
            </Link>
            <Link href="/dashboard">
              <Button size="lg" variant="outline">
                Join the expert network
              </Button>
            </Link>
          </div>

          <ul className="mt-10 flex flex-wrap gap-x-8 gap-y-3">
            {heroHighlights.map((highlight) => {
              const Icon =
                HIGHLIGHT_ICONS[highlight.id as keyof typeof HIGHLIGHT_ICONS];

              return (
                <li
                  key={highlight.id}
                  className="flex items-center gap-2 text-sm text-muted-foreground"
                >
                  <Icon className="h-4 w-4 text-primary" aria-hidden="true" />
                  {highlight.label}
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex justify-center lg:justify-end">
          <ExpertNetworkGraphic />
        </div>
      </div>
    </section>
  );
}
