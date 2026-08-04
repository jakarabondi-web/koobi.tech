"use client";

import { useState } from "react";
import type { CSSProperties } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { ICON_BADGE_COLORS } from "@/lib/constants/icon-colors";
import type { FeatureBentoItem } from "@/components/marketing/feature-bento";

/**
 * Stacked-row alternative to FeatureBento, used only for the homepage's
 * "What we do" services band so it reads as a distinct section rather than
 * a repeat of the Quality/Security card grids below it. Each row tints
 * toward its own accent color on hover/open (via the `--accent` custom
 * property, cycled the same way ICON_BADGE_COLORS is) and reveals a
 * description plus a few detail chips on click.
 */

export type ServiceLedgerItem = FeatureBentoItem & { chips: string[] };

const ACCENT_VARS = ["--primary", "--accent-violet", "--accent-teal", "--accent-amber"] as const;

export function ServiceLedger({ items }: { items: ServiceLedgerItem[] }) {
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
      <div className="relative flex flex-col">
        {items.map((item, i) => {
          const isOpen = open.has(i);
          const accentVar = ACCENT_VARS[i % ACCENT_VARS.length];
          return (
            <button
              key={item.title}
              type="button"
              onClick={() => toggle(i)}
              aria-expanded={isOpen}
              style={{ "--accent": `var(${accentVar})` } as CSSProperties}
              className={cn(
                "group grid w-full grid-cols-[2.5rem_3.5rem_1fr_auto] items-center gap-4 rounded-xl px-4 py-4 text-left shadow-[inset_3px_0_0_0_transparent] transition-[background,box-shadow] duration-300",
                i > 0 && "border-t border-white/10",
                "hover:bg-[color-mix(in_oklch,var(--accent)_20%,rgba(255,255,255,0.03))] hover:shadow-[inset_3px_0_0_0_var(--accent)]",
                isOpen &&
                  "bg-[color-mix(in_oklch,var(--accent)_15%,rgba(255,255,255,0.05))] shadow-[inset_3px_0_0_0_var(--accent)]"
              )}
            >
              <span
                className={cn(
                  "font-mono text-xs font-bold text-white/35 transition-colors duration-300 group-hover:text-[var(--accent)]",
                  isOpen && "text-[var(--accent)]"
                )}
              >
                {String(i + 1).padStart(2, "0")}
              </span>
              <span
                className={cn(
                  "flex size-14 shrink-0 items-center justify-center rounded-2xl transition-transform duration-300 group-hover:scale-110",
                  ICON_BADGE_COLORS[i % ICON_BADGE_COLORS.length],
                  "group-hover:bg-[color-mix(in_oklch,var(--accent)_38%,transparent)]",
                  isOpen && "-rotate-3 scale-110"
                )}
              >
                {item.icon}
              </span>
              <div className="min-w-0">
                <h3
                  className={cn(
                    "text-sm font-semibold text-white transition-colors duration-300 group-hover:text-[var(--accent)]",
                    isOpen && "text-[var(--accent)]"
                  )}
                >
                  {item.title}
                </h3>
                <span className="mt-1 block font-mono text-[10px] uppercase tracking-widest text-white/40">
                  {item.tag}
                </span>
              </div>
              <ChevronDown
                className={cn(
                  "size-4 shrink-0 text-white/40 transition-transform duration-300 group-hover:text-[var(--accent)]",
                  isOpen ? "rotate-180 text-[var(--accent)]" : "rotate-0"
                )}
              />
              <div
                className={cn(
                  "col-span-4 grid transition-all duration-300 ease-out",
                  isOpen ? "mt-3 grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
                )}
              >
                <div className="overflow-hidden pl-32">
                  <p className="max-w-2xl text-sm leading-relaxed text-white/65">{item.desc}</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {item.chips.map((chip, ci) => (
                      <span
                        key={chip}
                        className={cn(
                          "rounded-full border border-white/15 px-3 py-1 text-[11px] font-semibold text-white/75 transition-all duration-300",
                          isOpen ? "translate-y-0 opacity-100" : "translate-y-1.5 opacity-0"
                        )}
                        style={{ transitionDelay: isOpen ? `${80 + ci * 80}ms` : "0ms" }}
                      >
                        {chip}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
