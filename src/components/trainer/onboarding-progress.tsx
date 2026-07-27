import Link from "next/link";
import { Check } from "lucide-react";

import type { TrainerGateState } from "@/lib/permissions/gating";
import { onboardingSteps, type OnboardingStep } from "@/lib/permissions/onboarding-steps";
import { cn } from "@/lib/utils/cn";

function Marker({ step, index }: { step: OnboardingStep; index: number }) {
  return (
    <span
      className={cn(
        "flex size-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold tabular-nums",
        step.status === "done" && "border-success bg-success text-success-foreground",
        step.status === "current" && "border-primary bg-primary text-primary-foreground",
        step.status === "upcoming" && "border-border bg-background text-muted-foreground"
      )}
    >
      {step.status === "done" ? <Check className="size-4" aria-hidden="true" /> : index + 1}
    </span>
  );
}

export function OnboardingProgress({ gate }: { gate: TrainerGateState }) {
  const steps = onboardingSteps(gate);
  if (!steps) return null;

  const done = steps.filter((s) => s.status === "done").length;

  return (
    <section
      aria-label="Application progress"
      className="rounded-xl border border-border bg-card p-5"
    >
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold">Getting you approved</h2>
        <p className="text-xs text-muted-foreground tabular-nums">
          {done} of {steps.length} complete
        </p>
      </div>

      <ol className="mt-5 grid gap-5 sm:grid-cols-5 sm:gap-3">
        {steps.map((step, index) => (
          <li
            key={step.key}
            aria-current={step.status === "current" ? "step" : undefined}
            className="relative flex gap-3 sm:flex-col sm:gap-2"
          >
            {/* Connector. Horizontal between columns on wide screens, vertical
                down the marker gutter on narrow ones. */}
            {index < steps.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  "absolute left-4 top-9 h-[calc(100%+1.25rem-2.25rem)] w-px -translate-x-1/2",
                  "sm:left-auto sm:top-4 sm:h-px sm:w-[calc(100%-2.5rem)] sm:translate-x-10 sm:translate-y-0",
                  step.status === "done" ? "bg-success" : "bg-border"
                )}
              />
            ) : null}

            <Marker step={step} index={index} />

            <div className="min-w-0 space-y-0.5">
              <p
                className={cn(
                  "text-sm font-medium leading-tight",
                  step.status === "upcoming" && "text-muted-foreground"
                )}
              >
                {step.href ? (
                  <Link href={step.href} className="hover:underline">
                    {step.label}
                  </Link>
                ) : (
                  step.label
                )}
              </p>
              <p className="text-xs leading-snug text-muted-foreground">{step.description}</p>
            </div>
          </li>
        ))}
      </ol>
    </section>
  );
}
