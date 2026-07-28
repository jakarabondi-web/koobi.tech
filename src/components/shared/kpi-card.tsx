import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { ICON_BADGE_COLORS } from "@/lib/constants/icon-colors";

// Deterministic color pick from the label text, not a prop — call sites
// (27 of them across trainer/client/admin dashboards) render KpiCards
// independently with no shared index to coordinate a rotation, so hashing
// the label is what gives a stat row visual variety without every call
// site needing to pass a colorIndex.
function colorForLabel(label: string) {
  let hash = 0;
  for (let i = 0; i < label.length; i++) hash = (hash * 31 + label.charCodeAt(i)) | 0;
  return ICON_BADGE_COLORS[Math.abs(hash) % ICON_BADGE_COLORS.length];
}

export function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  trendLabel,
  className,
}: {
  label: string;
  value: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "flat";
  trendLabel?: string;
  className?: string;
}) {
  return (
    <div className={cn("relative overflow-hidden rounded-2xl bg-navy p-5", className)}>
      <div className="pointer-events-none absolute -top-10 -right-10 size-32 rounded-full bg-accent-violet/20 blur-2xl" />
      <div className="relative flex items-start justify-between gap-3">
        <div className="space-y-1">
          <p className="text-xs font-medium text-white/60">{label}</p>
          <p className="text-2xl font-semibold tracking-tight text-white">{value}</p>
          {trendLabel ? (
            <p
              className={cn(
                "text-xs font-medium",
                trend === "up" && "text-success",
                trend === "down" && "text-destructive",
                trend === "flat" && "text-white/50"
              )}
            >
              {trendLabel}
            </p>
          ) : null}
        </div>
        {Icon ? (
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", colorForLabel(label))}>
            <Icon className="size-4.5" />
          </span>
        ) : null}
      </div>
    </div>
  );
}
