import type { ComponentType } from "react";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/**
 * Premium bento-grid presentation for icon+title+desc feature lists —
 * replaces the plain bordered-card grid pattern that used to repeat across
 * the marketing site. Dark navy field, glass cards, glow accents; the first
 * item gets an oversized featured cell so the grid has visual rhythm
 * instead of N identical boxes.
 */

export type FeatureBentoItem = {
  title: string;
  desc: string;
  icon: ComponentType<{ className?: string }>;
  tag: string;
};

const COLORS = [
  "text-primary bg-primary/10",
  "text-accent-violet bg-accent-violet/10",
  "text-accent-teal bg-accent-teal/10",
  "text-accent-amber bg-accent-amber/10",
];

export function FeatureBento({
  items,
  /** The featured (large) cell is a 2x2 span instead of the standard 1x1 —
   *  set false for larger sets (8 items) where forcing a featured cell
   *  fights the grid's auto-placement and leaves gaps. */
  featured = true,
}: {
  items: FeatureBentoItem[];
  featured?: boolean;
}) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-navy p-6 sm:p-8">
      <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-accent-violet/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map((item, i) => {
          const isFeatured = featured && i === 0;
          return (
            <div
              key={item.title}
              className={cn(
                "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.07]",
                isFeatured ? "col-span-2 row-span-2 min-h-[220px]" : "min-h-[150px]"
              )}
            >
              <div className="flex items-start justify-between">
                <span className={cn("flex size-10 items-center justify-center rounded-xl", COLORS[i % COLORS.length])}>
                  <item.icon className="size-5" />
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">{item.tag}</span>
              </div>
              <div className="mt-auto pt-4">
                <h3 className={cn("font-semibold text-white", isFeatured ? "text-xl" : "text-sm")}>{item.title}</h3>
                <p className={cn("mt-1.5 text-white/60", isFeatured ? "text-sm leading-relaxed" : "text-xs leading-snug")}>
                  {item.desc}
                </p>
              </div>
              <ArrowUpRight className="absolute right-4 top-4 size-4 text-white/0 transition-all duration-300 group-hover:text-white/40" />
            </div>
          );
        })}
      </div>
    </div>
  );
}
