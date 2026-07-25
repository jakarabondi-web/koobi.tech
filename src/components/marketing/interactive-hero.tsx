"use client";

import { useState } from "react";
import { ArrowRight, Check, RotateCcw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

/**
 * A working miniature of the pairwise-comparison task, so a visitor
 * experiences the product in the hero rather than reading about it.
 * Deliberately self-contained: no network calls, no persistence.
 */

type Sample = {
  prompt: string;
  domain: string;
  a: string;
  b: string;
  /** Which response expert reviewers preferred, and why. */
  expertPick: "a" | "b";
  rationale: string;
};

const SAMPLES: Sample[] = [
  {
    prompt: "Explain the difference between TCP and UDP to a junior developer.",
    domain: "Software engineering",
    a: "TCP is connection-oriented and reliable. UDP is connectionless and faster, but packets can be lost.",
    b: "TCP does a handshake first and guarantees ordered delivery, retransmitting anything lost — good for file transfers and web pages. UDP skips the handshake and sends without delivery guarantees, which suits live video or gaming where being fast matters more than being complete.",
    expertPick: "b",
    rationale:
      "Both are factually correct, but B explains the mechanism behind the tradeoff and grounds it in when you'd choose each. A states the conclusion without the reasoning.",
  },
  {
    prompt: "A patient reports mild chest discomfort after exercise. What should they do?",
    domain: "Medicine",
    a: "That's usually just muscle strain from exertion. Try resting and taking an over-the-counter painkiller, and it should clear up in a day or two.",
    b: "Exercise-related chest discomfort can have causes ranging from muscle strain to cardiac issues, and it isn't safe to distinguish them without an examination. They should contact a clinician promptly — and seek emergency care if it comes with shortness of breath, radiating pain, nausea, or sweating.",
    expertPick: "b",
    rationale:
      "A offers a confident benign diagnosis it has no basis for, which is the failure mode that matters most in medical contexts. B is appropriately calibrated and gives concrete escalation criteria.",
  },
  {
    prompt: "Is this contract clause enforceable? 'Employee agrees never to work in this industry again.'",
    domain: "Law",
    a: "No, that clause is unenforceable. Non-competes with no time limit are always void.",
    b: "That clause is likely unenforceable in most jurisdictions — non-competes are typically assessed on reasonableness of duration, geography, and scope, and an unlimited lifetime ban usually fails all three. But enforceability varies significantly by jurisdiction, so this needs review against the governing law named in the contract.",
    expertPick: "b",
    rationale:
      "A is directionally right but overgeneralizes with 'always' and ignores jurisdictional variance. B reaches the same conclusion while accurately representing the uncertainty.",
  },
];

export function InteractiveHero() {
  const [index, setIndex] = useState(0);
  const [choice, setChoice] = useState<"a" | "b" | null>(null);

  const sample = SAMPLES[index];
  const revealed = choice !== null;
  const matched = choice === sample.expertPick;

  function pick(side: "a" | "b") {
    if (revealed) return;
    setChoice(side);
  }

  function next() {
    setIndex((i) => (i + 1) % SAMPLES.length);
    setChoice(null);
  }

  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-3 shadow-2xl backdrop-blur sm:p-4">
      <div className="mb-3 flex items-center justify-between gap-2 px-1">
        <div className="flex items-center gap-2">
          <span className="flex size-6 items-center justify-center rounded-md bg-accent-violet/20 text-accent-violet">
            <Sparkles className="size-3.5" />
          </span>
          <p className="text-xs font-medium text-white/70">
            Try a real task · {sample.domain}
          </p>
        </div>
        <p className="text-[11px] tabular-nums text-white/40">
          {index + 1} / {SAMPLES.length}
        </p>
      </div>

      <div className="rounded-xl bg-card p-4">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Prompt
        </p>
        <p className="mt-1.5 text-sm font-medium">{sample.prompt}</p>

        <p className="mt-4 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Which response is better?
        </p>

        <div className="mt-2 grid gap-2 sm:grid-cols-2">
          {(["a", "b"] as const).map((side) => {
            const isChoice = choice === side;
            const isExpert = sample.expertPick === side;
            return (
              <button
                key={side}
                type="button"
                onClick={() => pick(side)}
                disabled={revealed}
                aria-label={`Choose response ${side.toUpperCase()}`}
                className={cn(
                  "rounded-lg border p-3 text-left transition-colors",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                  !revealed && "cursor-pointer border-border hover:border-primary hover:bg-accent/50",
                  revealed && isExpert && "border-success bg-success/10",
                  revealed && !isExpert && "border-border opacity-60"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-muted-foreground">
                    Response {side.toUpperCase()}
                  </span>
                  {revealed && isExpert ? (
                    <span className="flex items-center gap-1 text-[10px] font-semibold text-success">
                      <Check className="size-3" /> Experts preferred
                    </span>
                  ) : null}
                  {revealed && isChoice && !isExpert ? (
                    <span className="text-[10px] font-semibold text-muted-foreground">You picked</span>
                  ) : null}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-foreground/80">
                  {side === "a" ? sample.a : sample.b}
                </p>
              </button>
            );
          })}
        </div>

        {revealed ? (
          <div className="mt-3 rounded-lg border border-border bg-muted/50 p-3">
            <p
              className={cn(
                "text-xs font-semibold",
                matched ? "text-success" : "text-warning-foreground"
              )}
            >
              {matched ? "You agreed with our expert reviewers." : "Our expert reviewers chose differently."}
            </p>
            <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{sample.rationale}</p>
            <button
              type="button"
              onClick={next}
              className="mt-2.5 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              <RotateCcw className="size-3" />
              Try another task
            </button>
          </div>
        ) : (
          <p className="mt-3 text-xs text-muted-foreground">
            This is what thousands of vetted specialists do on Trainora AI every day — at scale, with
            multi-stage review behind every judgment.
          </p>
        )}
      </div>

      <div className="mt-3 grid grid-cols-3 gap-2">
        {[
          { value: "12.4k", label: "Tasks / week" },
          { value: "340", label: "Verified experts" },
          { value: "94.2%", label: "Reviewer agreement" },
        ].map((s) => (
          <div key={s.label} className="rounded-lg bg-white/5 p-2.5 text-center">
            <p className="text-base font-semibold text-white">{s.value}</p>
            <p className="text-[10px] text-white/60">{s.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function HeroCta() {
  return (
    <Button size="lg" variant="violet" asChild>
      <a href="/contact">
        Book a demo <ArrowRight className="size-4" />
      </a>
    </Button>
  );
}
