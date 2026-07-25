import { CircleCheck, CircleDollarSign, CircleDot } from "lucide-react";

import { Panel } from "@/components/dashboard/panel";
import type { NotificationItem } from "@/lib/types";

const TONES = {
  success: { icon: CircleCheck, className: "text-primary" },
  info: { icon: CircleDot, className: "text-muted-foreground" },
  payment: { icon: CircleDollarSign, className: "text-secondary" },
} as const;

export function NotificationsPanel({ items }: { items: NotificationItem[] }) {
  return (
    <Panel
      title="Notifications"
      footerLink={{ label: "View all notifications", href: "/dashboard/notifications" }}
    >
      <ul className="divide-y divide-border">
        {items.map((item) => {
          const tone = TONES[item.tone];
          const Icon = tone.icon;

          return (
            <li
              key={item.id}
              className="flex items-start justify-between gap-4 py-4 first:pt-0"
            >
              <div className="flex min-w-0 items-start gap-3">
                <Icon
                  className={`mt-0.5 h-4 w-4 shrink-0 ${tone.className}`}
                  aria-hidden="true"
                />
                <div className="min-w-0">
                  <p className="text-sm font-semibold">{item.title}</p>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    {item.detail}
                  </p>
                </div>
              </div>

              <span className="shrink-0 text-xs text-muted-foreground">
                {item.timeAgo}
              </span>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
