"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { ICON_BADGE_COLORS } from "@/lib/constants/icon-colors";

/**
 * Premium bento presentation for icon+title+desc feature lists — replaces
 * the plain bordered-card grid pattern that used to repeat across the
 * marketing site. Dark navy field, glass cards, glow accents. Every card is
 * the same size and shows only its icon, title, and tag by default; the
 * description is progressive disclosure, revealed on click — keeps the
 * grid scannable at a glance instead of front-loading every card with a
 * paragraph.
 *
 * `icon` is a rendered element (e.g. `<GitCompareArrows className="size-6" />`),
 * not a component reference — the pages using this are server components
 * (they export `metadata`, which requires it), and a Lucide component
 * reference can't cross the server→client prop boundary, only its already-
 * rendered output can.
 */

export type FeatureBentoItem = {
  title: string;
  desc: string;
  icon: ReactNode;
  tag: string;
};

const COLORS = ICON_BADGE_COLORS;

export function FeatureBento({ items }: { items: FeatureBentoItem[] }) {
  const [open, setOpen] = useState<Set<number>>(new Set());

  function toggle(i: number) {
    setOpen((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });
  }

  return (
    <div className="relative overflow-hidden rounded-3xl bg-navy p-6 sm:p-8">
      <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-accent-violet/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map((item, i) => {
          const isOpen = open.has(i);
          return (
            <button
              key={item.title}
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              className={cn(
                "group relative flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 text-left backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.07]"
              )}
            >
              <div className="flex items-start justify-between">
                <span className={cn("flex size-12 items-center justify-center rounded-xl", COLORS[i % COLORS.length])}>
                  {item.icon}
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">{item.tag}</span>
              </div>
              <div className="mt-4 flex items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">{item.title}</h3>
                <ChevronDown
                  className={cn(
                    "size-4 shrink-0 text-white/40 transition-transform duration-300",
                    isOpen ? "rotate-180" : "rotate-0"
                  )}
                />
              </div>
              {/* grid-rows trick for a smooth height animation without a
                  fixed max-height guess — 0fr/1fr both interpolate cleanly. */}
              <div
                className={cn(
                  "grid transition-all duration-300 ease-out",
                  isOpen ? "mt-2 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <p className="overflow-hidden text-xs leading-relaxed text-white/60">{item.desc}</p>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
