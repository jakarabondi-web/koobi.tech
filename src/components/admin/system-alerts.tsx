import { AlertCircle, Info, OctagonAlert } from "lucide-react";

import { Panel } from "@/components/dashboard/panel";
import type { AlertSeverity, SystemAlert } from "@/lib/types";
import { cn } from "@/lib/utils";

const SEVERITY = {
  critical: { icon: OctagonAlert, className: "text-destructive", label: "Critical" },
  warning: { icon: AlertCircle, className: "text-amber-500", label: "Warning" },
  info: { icon: Info, className: "text-primary", label: "Info" },
} satisfies Record<
  AlertSeverity,
  { icon: typeof Info; className: string; label: string }
>;

export function SystemAlerts({ alerts }: { alerts: SystemAlert[] }) {
  return (
    <Panel
      title="System Alerts"
      footerLink={{ label: "View all alerts", href: "/admin/alerts" }}
    >
      <ul className="space-y-5">
        {alerts.map((alert) => {
          const severity = SEVERITY[alert.severity];
          const Icon = severity.icon;

          return (
            <li key={alert.id} className="flex items-start gap-3">
              <Icon
                className={cn("mt-0.5 h-4 w-4 shrink-0", severity.className)}
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm font-semibold">
                  <span className="sr-only">{severity.label}: </span>
                  {alert.title}
                </p>
                <p className="mt-0.5 text-xs text-muted-foreground">{alert.detail}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
