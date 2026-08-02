import Link from "next/link";
import { Check } from "lucide-react";

import type { TrainerGateState } from "@/lib/permissions/gating";
import { onboardingSteps, type OnboardingStep } from "@/lib/permissions/onboarding-steps";
import { cn } from "@/lib/utils/cn";

const RING_RADIUS = 28;
const RING_CIRCUMFERENCE = 2 * Math.PI * RING_RADIUS;

function ProgressRing({ percent }: { percent: number }) {
  const offset = RING_CIRCUMFERENCE * (1 - percent / 100);
  return (
    <div className="relative size-16 shrink-0">
      <svg viewBox="0 0 64 64" className="-rotate-90">
        <circle cx="32" cy="32" r={RING_RADIUS} fill="none" strokeWidth="6" className="stroke-muted" />
        <circle
          cx="32"
          cy="32"
          r={RING_RADIUS}
          fill="none"
          strokeWidth="6"
          strokeLinecap="round"
          stroke="url(#onboarding-ring-grad)"
          strokeDasharray={RING_CIRCUMFERENCE}
          strokeDashoffset={offset}
          className="transition-[stroke-dashoffset] duration-500 ease-out"
        />
        <defs>
          <linearGradient id="onboarding-ring-grad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" className="[stop-color:var(--primary)]" />
            <stop offset="55%" className="[stop-color:var(--accent-violet)]" />
            <stop offset="100%" className="[stop-color:var(--accent-pink)]" />
          </linearGradient>
        </defs>
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-sm font-semibold tabular-nums">
        {percent}%
      </span>
    </div>
  );
}

function StatusIcon({ status }: { status: OnboardingStep["status"] }) {
  if (status === "done") {
    return (
      <span className="flex size-5 items-center justify-center rounded-full bg-success text-success-foreground">
        <Check className="size-3" aria-hidden="true" />
      </span>
    );
  }
  if (status === "current") {
    return (
      <span className="relative flex size-5 items-center justify-center">
        <span className="absolute inline-flex size-3 animate-ping rounded-full bg-primary/70" aria-hidden="true" />
        <span className="relative size-3 rounded-full bg-primary" />
      </span>
    );
  }
  return <span className="size-3 rounded-full border border-border" aria-hidden="true" />;
}

const STATUS_LABEL: Record<OnboardingStep["status"], string> = {
  done: "Done",
  current: "In progress",
  upcoming: "Not yet",
};

export function OnboardingProgress({ gate }: { gate: TrainerGateState }) {
  const steps = onboardingSteps(gate);
  if (!steps) return null;

  const done = steps.filter((s) => s.status === "done").length;
  const current = steps.find((s) => s.status === "current");
  const percent = Math.round((done / steps.length) * 100);

  return (
    <section aria-label="Application progress" className="rounded-xl border border-border bg-card p-5 sm:p-6">
      <div className="flex items-center gap-4">
        <ProgressRing percent={percent} />
        <div className="min-w-0">
          <h2 className="text-sm font-semibold">
            {current ? `Stage ${steps.indexOf(current) + 1} of ${steps.length} — ${current.label}` : "You're all set"}
          </h2>
          <p className="mt-0.5 text-xs text-muted-foreground tabular-nums">
            {done} of {steps.length} steps complete
          </p>
        </div>
      </div>

      <ol className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {steps.map((step, index) => (
          <li
            key={step.key}
            aria-current={step.status === "current" ? "step" : undefined}
            className={cn(
              "flex flex-col gap-1.5 rounded-lg border border-border bg-background p-4",
              step.status === "current" && "border-primary shadow-glow-brand",
              step.status === "upcoming" && "opacity-60"
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <span className="text-xs text-muted-foreground tabular-nums">
                {String(index + 1).padStart(2, "0")}
              </span>
              <StatusIcon status={step.status} />
            </div>
            <p className={cn("text-sm font-medium leading-tight", step.status === "upcoming" && "text-muted-foreground")}>
              {step.href ? (
                <Link href={step.href} className="hover:underline">
                  {step.label}
                </Link>
              ) : (
                step.label
              )}
            </p>
            <p className="text-xs leading-snug text-muted-foreground">{step.description}</p>
            <p className="mt-auto border-t border-border pt-2 text-xs text-muted-foreground">
              {STATUS_LABEL[step.status]}
            </p>
          </li>
        ))}
      </ol>
    </section>
  );
}
