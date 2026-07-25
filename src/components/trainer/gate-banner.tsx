import Link from "next/link";
import { Clock, ShieldCheck, FileText, AlertTriangle, CheckCircle2, PauseCircle } from "lucide-react";

import type { TrainerGateState } from "@/lib/permissions/gating";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const STYLES: Record<
  TrainerGateState["stage"],
  { icon: typeof Clock; ring: string; iconTone: string }
> = {
  application_not_started: { icon: FileText, ring: "border-primary/40 bg-primary/5", iconTone: "text-primary" },
  assessment_required: { icon: FileText, ring: "border-primary/40 bg-primary/5", iconTone: "text-primary" },
  identity_required: { icon: ShieldCheck, ring: "border-primary/40 bg-primary/5", iconTone: "text-primary" },
  under_review: { icon: Clock, ring: "border-info/40 bg-info/10", iconTone: "text-foreground" },
  more_info_required: { icon: AlertTriangle, ring: "border-warning/50 bg-warning/10", iconTone: "text-warning-foreground" },
  waitlisted: { icon: PauseCircle, ring: "border-warning/50 bg-warning/10", iconTone: "text-warning-foreground" },
  approved: { icon: CheckCircle2, ring: "border-success/40 bg-success/10", iconTone: "text-success" },
  rejected: { icon: AlertTriangle, ring: "border-destructive/40 bg-destructive/10", iconTone: "text-destructive" },
  suspended: { icon: AlertTriangle, ring: "border-destructive/40 bg-destructive/10", iconTone: "text-destructive" },
};

export function GateBanner({ gate }: { gate: TrainerGateState }) {
  if (gate.stage === "approved") return null;

  const style = STYLES[gate.stage];
  const Icon = style.icon;

  return (
    <div className={cn("flex flex-col gap-3 rounded-xl border p-5 sm:flex-row sm:items-center", style.ring)}>
      <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-lg bg-background", style.iconTone)}>
        <Icon className="size-5" />
      </div>
      <div className="flex-1 space-y-1">
        <p className="text-sm font-semibold">{gate.title}</p>
        <p className="text-sm text-muted-foreground">{gate.message}</p>
      </div>
      {gate.actionHref ? (
        <Button variant="violet" size="sm" className="shrink-0" asChild>
          <Link href={gate.actionHref}>{gate.actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}

/** Full-page replacement shown where assignment content would otherwise be. */
export function GateBlocked({ gate }: { gate: TrainerGateState }) {
  const style = STYLES[gate.stage];
  const Icon = style.icon;

  return (
    <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed border-border px-6 py-20 text-center">
      <div className={cn("flex size-12 items-center justify-center rounded-full bg-accent", style.iconTone)}>
        <Icon className="size-6" />
      </div>
      <div className="space-y-1.5">
        <p className="text-base font-semibold">{gate.title}</p>
        <p className="mx-auto max-w-md text-sm text-muted-foreground">{gate.message}</p>
      </div>
      {gate.actionHref ? (
        <Button variant="violet" asChild>
          <Link href={gate.actionHref}>{gate.actionLabel}</Link>
        </Button>
      ) : null}
    </div>
  );
}
