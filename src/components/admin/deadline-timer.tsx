"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Live "time left" readout for a TaskAssignment's dueAt, used on the admin
 * task-assignments view. Ticks every 30s client-side — a per-second timer
 * would just churn re-renders for a value that's meaningful in minutes at
 * the finest.
 */
function formatRemaining(ms: number): string {
  const abs = Math.abs(ms);
  const totalMinutes = Math.floor(abs / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

export function DeadlineTimer({ dueAt, completedAt }: { dueAt: string | null; completedAt: string | null }) {
  // Starts null so server and first client render match (both render the
  // "—" placeholder below); the effect then ticks in the real value,
  // without calling setState synchronously from the effect body itself.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = setInterval(tick, 30_000);
    return () => clearInterval(id);
  }, []);

  if (completedAt) {
    return <span className="text-xs text-muted-foreground">Completed</span>;
  }
  if (!dueAt) {
    return <span className="text-xs text-muted-foreground">No deadline</span>;
  }
  // Render nothing time-sensitive until mounted, to avoid a server/client
  // markup mismatch on the exact remaining-time string.
  if (now === null) {
    return <span className="text-xs text-muted-foreground">—</span>;
  }

  const diff = new Date(dueAt).getTime() - now;
  const overdue = diff < 0;

  return (
    <span
      className={cn(
        "font-mono text-xs font-semibold tabular-nums",
        overdue ? "text-destructive" : diff < 3 * 3_600_000 ? "text-warning" : "text-foreground"
      )}
    >
      {overdue ? `Overdue ${formatRemaining(diff)}` : `${formatRemaining(diff)} left`}
    </span>
  );
}
