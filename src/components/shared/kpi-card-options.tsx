import type { ReactNode } from "react";

import { cn } from "@/lib/utils/cn";
import { ICON_BADGE_COLORS } from "@/lib/constants/icon-colors";

/**
 * Three candidate KpiCard redesigns for the dashboards, extending the
 * marketing site's dark-navy bento language. Throwaway preview components —
 * see feature-bento.tsx's own history for the same screenshot-then-pick
 * approach.
 */

export type KpiPreviewItem = {
  label: string;
  value: string;
  icon: ReactNode;
  trendLabel?: string;
  trend?: "up" | "down" | "flat";
};

/* A. Dark navy glass tiles — each card is its own navy cell, like a single
   FeatureBento cell lifted out on its own. */
export function KpiOptionA({ items }: { items: KpiPreviewItem[] }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => (
        <div key={item.label} className="relative overflow-hidden rounded-2xl bg-navy p-5">
          <div className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-accent-violet/20 blur-2xl" />
          <div className="relative flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-white/60">{item.label}</p>
              <p className="text-2xl font-semibold tracking-tight text-white">{item.value}</p>
              {item.trendLabel ? (
                <p
                  className={cn(
                    "text-xs font-medium",
                    item.trend === "up" && "text-success",
                    item.trend === "down" && "text-destructive",
                    item.trend === "flat" && "text-white/50"
                  )}
                >
                  {item.trendLabel}
                </p>
              ) : null}
            </div>
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg",
                ICON_BADGE_COLORS[i % ICON_BADGE_COLORS.length]
              )}
            >
              {item.icon}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* B. Dark navy band container — one navy band holding all cards as glass
   cells inside, exactly mirroring the marketing FeatureBento container. */
export function KpiOptionB({ items }: { items: KpiPreviewItem[] }) {
  return (
    <div className="relative overflow-hidden rounded-3xl bg-navy p-6 sm:p-8">
      <div className="pointer-events-none absolute -top-24 -right-24 size-72 rounded-full bg-accent-violet/25 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-24 -left-24 size-72 rounded-full bg-primary/20 blur-3xl" />
      <div className="relative grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {items.map((item, i) => (
          <div
            key={item.label}
            className="rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="text-xs font-medium text-white/60">{item.label}</p>
                <p className="text-2xl font-semibold tracking-tight text-white">{item.value}</p>
                {item.trendLabel ? (
                  <p
                    className={cn(
                      "text-xs font-medium",
                      item.trend === "up" && "text-success",
                      item.trend === "down" && "text-destructive",
                      item.trend === "flat" && "text-white/50"
                    )}
                  >
                    {item.trendLabel}
                  </p>
                ) : null}
              </div>
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-lg",
                  ICON_BADGE_COLORS[i % ICON_BADGE_COLORS.length]
                )}
              >
                {item.icon}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* C. Light cards, dark-navy icon chip — keeps cards light/readable (better
   for dense data screens) but the icon badge becomes a solid navy chip with
   a colored icon, so the brand accent shows without darkening every tile. */
export function KpiOptionC({ items }: { items: KpiPreviewItem[] }) {
  const iconColors = ["text-primary", "text-accent-violet", "text-accent-teal", "text-accent-amber"];
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {items.map((item, i) => (
        <div key={item.label} className="rounded-2xl border border-border bg-card p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
              <p className="text-2xl font-semibold tracking-tight">{item.value}</p>
              {item.trendLabel ? (
                <p
                  className={cn(
                    "text-xs font-medium",
                    item.trend === "up" && "text-success",
                    item.trend === "down" && "text-destructive",
                    item.trend === "flat" && "text-muted-foreground"
                  )}
                >
                  {item.trendLabel}
                </p>
              ) : null}
            </div>
            <span
              className={cn(
                "flex size-9 shrink-0 items-center justify-center rounded-lg bg-navy",
                iconColors[i % iconColors.length]
              )}
            >
              {item.icon}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
