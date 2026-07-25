import {
  ClipboardCheck,
  CreditCard,
  MessageSquareWarning,
  ShieldAlert,
  UserCheck,
  type LucideIcon,
} from "lucide-react";

import { Panel } from "@/components/dashboard/panel";
import type { PendingItem } from "@/lib/types";

const ICONS: Record<PendingItem["icon"], LucideIcon> = {
  "user-check": UserCheck,
  "clipboard-check": ClipboardCheck,
  "message-square-warning": MessageSquareWarning,
  "shield-alert": ShieldAlert,
  "credit-card": CreditCard,
};

export function PendingItems({ items }: { items: PendingItem[] }) {
  return (
    <Panel
      title="Pending Items"
      footerLink={{ label: "View all pending", href: "/admin/tasks" }}
    >
      <ul className="divide-y divide-border">
        {items.map((item) => {
          const Icon = ICONS[item.icon];

          return (
            <li key={item.id} className="flex items-start gap-3 py-4 first:pt-0">
              <Icon
                className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground"
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium">{item.label}</p>
                <p className="mt-1 text-lg font-bold tracking-tight">{item.count}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{item.note}</p>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
