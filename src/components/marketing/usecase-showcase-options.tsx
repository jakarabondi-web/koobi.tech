"use client";

import { useState } from "react";
import type { ComponentType } from "react";
import { ArrowUpRight } from "lucide-react";

import { cn } from "@/lib/utils/cn";

/**
 * Three candidate redesigns for the "bulleted feature card" pattern used
 * across the marketing site (for-companies USE_CASES, services SERVICES,
 * etc). Built to be screenshotted and narrowed to one — see hero-bg-options
 * from the earlier hero redesign for the same throwaway-preview approach.
 */

export type ShowcaseItem = {
  title: string;
  desc: string;
  icon: ComponentType<{ className?: string }>;
  tag: string;
};

const COLORS = ["text-primary bg-primary/10", "text-accent-violet bg-accent-violet/10", "text-accent-teal bg-accent-teal/10", "text-accent-amber bg-accent-amber/10"];

/* ---------------------------------------------------------------------- */
/* A. Premium bento grid — asymmetric spans, dark navy field, glow-on-hover */
/* ---------------------------------------------------------------------- */

export function ShowcaseBento({ items }: { items: ShowcaseItem[] }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-navy p-6 sm:p-8">
      <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-accent-violet/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative grid grid-cols-2 gap-4 lg:grid-cols-4">
        {items.map((item, i) => (
          <div
            key={item.title}
            className={cn(
              "group relative flex flex-col justify-between overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur transition-all duration-300 hover:-translate-y-1 hover:border-white/25 hover:bg-white/[0.07]",
              i === 0 ? "col-span-2 row-span-2 min-h-[220px]" : "min-h-[140px]"
            )}
          >
            <div className="flex items-start justify-between">
              <span className={cn("flex size-10 items-center justify-center rounded-xl", COLORS[i % COLORS.length])}>
                <item.icon className="size-5" />
              </span>
              <span className="font-mono text-[10px] uppercase tracking-widest text-white/35">{item.tag}</span>
            </div>
            <div className="mt-auto pt-4">
              <h3 className={cn("font-semibold text-white", i === 0 ? "text-xl" : "text-sm")}>{item.title}</h3>
              <p className={cn("mt-1.5 text-white/60", i === 0 ? "text-sm leading-relaxed" : "text-xs leading-snug")}>
                {item.desc}
              </p>
            </div>
            <ArrowUpRight className="absolute right-4 top-4 size-4 text-white/0 transition-all duration-300 group-hover:text-white/40" />
          </div>
        ))}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* B. Editorial index list — oversized ghost numerals, consulting-deck feel */
/* ---------------------------------------------------------------------- */

export function ShowcaseEditorial({ items }: { items: ShowcaseItem[] }) {
  return (
    <div className="divide-y divide-border rounded-2xl border border-border bg-card">
      {items.map((item, i) => (
        <div
          key={item.title}
          className="group relative flex items-center gap-6 overflow-hidden px-6 py-6 transition-colors hover:bg-accent/40 sm:px-8"
        >
          <span className="pointer-events-none select-none font-mono text-5xl font-bold text-foreground/[0.06] sm:text-6xl">
            {String(i + 1).padStart(2, "0")}
          </span>
          <span className={cn("flex size-11 shrink-0 items-center justify-center rounded-xl", COLORS[i % COLORS.length])}>
            <item.icon className="size-5" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3 className="text-base font-semibold tracking-tight">{item.title}</h3>
              <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">{item.tag}</span>
            </div>
            <p className="mt-1 max-w-lg text-sm text-muted-foreground">{item.desc}</p>
          </div>
          <ArrowUpRight className="size-4 shrink-0 text-muted-foreground/40 transition-transform duration-300 group-hover:translate-x-1 group-hover:-translate-y-1 group-hover:text-foreground" />
        </div>
      ))}
    </div>
  );
}

/* ---------------------------------------------------------------------- */
/* C. Interactive split showcase — tab list + large live preview panel     */
/* ---------------------------------------------------------------------- */

export function ShowcaseSplit({ items }: { items: ShowcaseItem[] }) {
  const [active, setActive] = useState(0);
  const current = items[active];

  return (
    <div className="grid overflow-hidden rounded-2xl border border-border bg-card lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <div className="divide-y divide-border border-b border-border lg:border-b-0 lg:border-r">
        {items.map((item, i) => (
          <button
            key={item.title}
            type="button"
            onClick={() => setActive(i)}
            className={cn(
              "flex w-full items-center gap-3 px-5 py-4 text-left transition-colors",
              active === i ? "bg-accent/60" : "hover:bg-accent/30"
            )}
          >
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg transition-colors",
                active === i ? COLORS[i % COLORS.length] : "bg-muted text-muted-foreground"
              )}
            >
              <item.icon className="size-4.5" />
            </span>
            <span className={cn("text-sm font-medium", active === i ? "text-foreground" : "text-muted-foreground")}>
              {item.title}
            </span>
            {active === i ? <span className="ml-auto h-5 w-0.5 rounded-full bg-primary" /> : null}
          </button>
        ))}
      </div>
      <div className="relative flex flex-col justify-center overflow-hidden bg-gradient-to-br from-surface to-background p-8 sm:p-10">
        <div className="pointer-events-none absolute -right-10 -top-10 size-48 rounded-full bg-primary/10 blur-3xl" />
        <span className={cn("relative flex size-14 items-center justify-center rounded-2xl", COLORS[active % COLORS.length])}>
          <current.icon className="size-6" />
        </span>
        <span className="relative mt-5 font-mono text-[11px] uppercase tracking-widest text-primary">{current.tag}</span>
        <h3 className="relative mt-1.5 text-2xl font-semibold tracking-tight">{current.title}</h3>
        <p className="relative mt-3 max-w-md text-sm leading-relaxed text-muted-foreground">{current.desc}</p>
      </div>
    </div>
  );
}
