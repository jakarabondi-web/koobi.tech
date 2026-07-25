import Link from "next/link";
import { Clock } from "lucide-react";

import { Panel } from "@/components/dashboard/panel";
import type { ActiveTask } from "@/lib/types";
import { cn, formatCurrency } from "@/lib/utils";

export function ActiveTasks({ tasks }: { tasks: ActiveTask[] }) {
  return (
    <Panel
      title="Your Active Tasks"
      footerLink={{ label: "View all tasks", href: "/dashboard/tasks" }}
    >
      <ul className="divide-y divide-border">
        {tasks.map((task) => (
          <li key={task.id} className="py-5 first:pt-0">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <p className="text-sm font-semibold">{task.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{task.reference}</p>
                <p className="mt-1 text-xs text-muted-foreground">{task.estimate}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold">
                {formatCurrency(task.payout)}
              </span>
            </div>

            <div className="mt-3 flex items-center justify-between gap-4">
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 text-xs font-medium",
                  task.urgent ? "text-amber-600" : "text-primary",
                )}
              >
                <Clock className="h-3.5 w-3.5" aria-hidden="true" />
                {task.dueIn}
              </span>

              <Link
                href={`/dashboard/tasks/${task.id}`}
                className="text-xs font-semibold text-primary hover:underline"
              >
                Continue
                <span className="sr-only"> {task.title}</span>
              </Link>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
