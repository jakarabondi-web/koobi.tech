import Link from "next/link";
import type { ReactNode } from "react";

import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface PanelProps {
  title: string;
  children: ReactNode;
  /** Rendered on the right of the header, e.g. a range selector. */
  action?: ReactNode;
  /** Renders a full-width link button at the bottom of the panel. */
  footerLink?: { label: string; href: string };
  className?: string;
  contentClassName?: string;
}

export function Panel({
  title,
  children,
  action,
  footerLink,
  className,
  contentClassName,
}: PanelProps) {
  return (
    <Card className={cn("flex flex-col", className)}>
      <div className="flex items-center justify-between gap-4 p-6 pb-4">
        <h2 className="text-lg font-bold tracking-tight">{title}</h2>
        {action}
      </div>

      <div className={cn("flex-1 px-6", contentClassName)}>{children}</div>

      {footerLink ? (
        <div className="p-6 pt-4">
          <Link
            href={footerLink.href}
            className="flex h-10 w-full items-center justify-center rounded-md border border-border text-sm font-semibold text-primary transition-colors hover:bg-primary/5"
          >
            {footerLink.label}
          </Link>
        </div>
      ) : (
        <div className="pb-6" />
      )}
    </Card>
  );
}

/** Static, non-interactive range chip used in panel headers. */
export function RangeChip({ label }: { label: string }) {
  return (
    <span className="inline-flex h-9 items-center gap-2 rounded-md border border-border px-3 text-xs font-medium text-muted-foreground">
      {label}
    </span>
  );
}
