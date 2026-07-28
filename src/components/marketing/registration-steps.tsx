"use client";

import { useEffect, useRef, useState } from "react";
import { UserPlus, ClipboardList, ClipboardCheck, Fingerprint, Rocket } from "lucide-react";

import { cn } from "@/lib/utils/cn";

type RegistrationStepData = {
  code: string;
  title: string;
  desc: string;
  icon: typeof UserPlus;
};

// Defined here, not passed in as a prop from the server page — Lucide icon
// components are function references, and functions can't cross the
// server → client serialization boundary as props.
//
// Mirrors the real applicant flow (src/lib/permissions/onboarding-steps.ts)
// — a progress claim on the marketing page has to match what actually
// happens after signup, not a simplified or aspirational version of it.
const REGISTRATION_STEPS: RegistrationStepData[] = [
  { code: "ACCOUNT", title: "Create your account", desc: "Sign up as a trainer or an AI company in under a minute.", icon: UserPlus },
  { code: "APPLICATION", title: "Submit your application", desc: "Tell us your domain and background — the fields that actually get reviewed.", icon: ClipboardList },
  { code: "ASSESSMENT", title: "Pass a qualification assessment", desc: "A short, domain-specific test of evaluation judgment, not trivia.", icon: ClipboardCheck },
  { code: "IDENTITY", title: "Verify your identity", desc: "A photo ID and a selfie confirm you're a real, accountable person.", icon: Fingerprint },
  { code: "MATCHING", title: "Get matched to paid work", desc: "Once approved, browse live projects in your domain and start earning.", icon: Rocket },
];

// Solid, genuinely distinct hues rather than blended gradients of the same
// two or three colors — adjacent gradient stops (e.g. "cyan to primary"
// next to "primary to violet") both contain blue and end up reading as one
// color from a glance. Rotating a flat fill per step is what keeps a
// five-item vertical list from reading as "step, step, step, step, step"
// with the same circle repeated five times. Muted amber/teal alongside the
// blue family for real variety, deliberately without pink or anything
// higher-chroma than the rest of the palette.
const STEP_COLORS = ["bg-primary", "bg-accent-violet", "bg-accent-teal", "bg-accent-amber", "bg-accent-cyan"];

function StepRow({ step, index }: { step: RegistrationStepData; index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.3, rootMargin: "0px 0px -10% 0px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={ref}
      className={cn(
        "relative flex gap-5 pb-12 transition-all duration-700 ease-out last:pb-0",
        visible ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"
      )}
      style={{ transitionDelay: `${index * 90}ms` }}
    >
      <div className="flex flex-col items-center">
        <span
          className={cn(
            "flex size-11 shrink-0 items-center justify-center rounded-full border-2 shadow-sm transition-all duration-500",
            visible
              ? cn("border-transparent text-white shadow-primary/20", STEP_COLORS[index % STEP_COLORS.length])
              : "border-border bg-card text-muted-foreground shadow-none"
          )}
        >
          <step.icon className="size-5" />
        </span>
        <span className="mt-3 flex-1 w-px bg-gradient-to-b from-border to-transparent last:hidden" aria-hidden="true" />
      </div>
      <div className="pt-1.5">
        <span className="font-mono text-[11px] uppercase tracking-widest text-primary">{step.code}</span>
        <h3 className="mt-1 text-lg font-semibold tracking-tight">{step.title}</h3>
        <p className="mt-1.5 max-w-md text-sm text-muted-foreground">{step.desc}</p>
      </div>
    </div>
  );
}

export function RegistrationSteps() {
  return (
    <div className="relative">
      {REGISTRATION_STEPS.map((step, i) => (
        <StepRow key={step.code} step={step} index={i} />
      ))}
    </div>
  );
}
