import { CircleCheck, CircleDot } from "lucide-react";

import { Panel } from "@/components/dashboard/panel";
import type { FeedbackItem } from "@/lib/types";

export function RecentFeedback({ feedback }: { feedback: FeedbackItem[] }) {
  return (
    <Panel
      title="Recent Feedback"
      footerLink={{ label: "View all feedback", href: "/dashboard/results" }}
    >
      <ul className="divide-y divide-border">
        {feedback.map((item) => {
          const positive = item.sentiment === "positive";
          const Icon = positive ? CircleCheck : CircleDot;

          return (
            <li key={item.id} className="flex items-start gap-3 py-4 first:pt-0">
              <Icon
                className={
                  positive
                    ? "mt-0.5 h-4 w-4 shrink-0 text-primary"
                    : "mt-0.5 h-4 w-4 shrink-0 text-destructive"
                }
                aria-hidden="true"
              />
              <div className="min-w-0">
                <p className="text-sm">
                  <span className="sr-only">
                    {positive ? "Positive feedback: " : "Improvement feedback: "}
                  </span>
                  {item.message}
                </p>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.project} · {item.timeAgo}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </Panel>
  );
}
