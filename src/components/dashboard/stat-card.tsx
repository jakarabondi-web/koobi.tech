import Link from "next/link";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";

import { Card } from "@/components/ui/card";
import type { Metric } from "@/lib/types";

export function StatCard({ metric }: { metric: Metric }) {
  const { label, value, delta, direction, note, action } = metric;
  const DeltaIcon = direction === "down" ? ArrowDownRight : ArrowUpRight;

  return (
    <Card className="p-5">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-bold tracking-tight">{value}</p>

      {delta ? (
        <p
          className={
            direction === "down"
              ? "mt-3 flex items-center gap-1 text-xs font-medium text-destructive"
              : "mt-3 flex items-center gap-1 text-xs font-medium text-primary"
          }
        >
          <DeltaIcon className="h-3.5 w-3.5" aria-hidden="true" />
          <span>{delta}</span>
        </p>
      ) : null}

      {note ? (
        <p className="mt-3 text-xs font-medium text-muted-foreground">{note}</p>
      ) : null}

      {action ? (
        <Link
          href={action.href}
          className="mt-3 inline-block text-xs font-semibold text-primary hover:underline"
        >
          {action.label}
        </Link>
      ) : null}
    </Card>
  );
}

export function StatCardGrid({ metrics }: { metrics: Metric[] }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
      {metrics.map((metric) => (
        <StatCard key={metric.id} metric={metric} />
      ))}
    </div>
  );
}
