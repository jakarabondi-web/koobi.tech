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
  { code: "STEP · 01", title: "Create your account", desc: "Sign up as a trainer or an AI company in under a minute.", icon: UserPlus },
  { code: "STEP · 02", title: "Submit your application", desc: "Tell us your domain and background — the fields that actually get reviewed.", icon: ClipboardList },
  { code: "STEP · 03", title: "Pass a qualification assessment", desc: "A short, domain-specific test of evaluation judgment, not trivia.", icon: ClipboardCheck },
  { code: "STEP · 04", title: "Verify your identity", desc: "A photo ID and a selfie confirm you're a real, accountable person.", icon: Fingerprint },
  { code: "STEP · 05", title: "Get matched to paid work", desc: "Once approved, browse live projects in your domain and start earning.", icon: Rocket },
];

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
            "flex size-11 shrink-0 items-center justify-center rounded-full border-2 transition-colors duration-500",
            visible ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card text-muted-foreground"
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
