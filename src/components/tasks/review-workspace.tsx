"use client";

import { useActionState, useState } from "react";
import { CheckCircle2, RefreshCw, XCircle, ArrowUpCircle, EyeOff } from "lucide-react";

import { recordReview, type ActionState } from "@/server/actions/reviews";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

const initialState: ActionState = { status: "idle" };

const DECISIONS = [
  { value: "APPROVED", label: "Approve", icon: CheckCircle2, tone: "border-success text-success" },
  { value: "REVISION_REQUESTED", label: "Request revision", icon: RefreshCw, tone: "border-warning text-warning-foreground" },
  { value: "REJECTED", label: "Reject", icon: XCircle, tone: "border-destructive text-destructive" },
  { value: "ESCALATED", label: "Escalate", icon: ArrowUpCircle, tone: "border-primary text-primary" },
] as const;

const ERROR_CATEGORIES = [
  "Factual error", "Missed the instruction", "Wrong preference", "Weak justification",
  "Safety issue missed", "Citation problem", "Insufficient detail",
];

const SCORE_CATEGORIES = [
  { key: "correctness", label: "Correctness" },
  { key: "reasoning_quality", label: "Reasoning quality" },
  { key: "instruction_following", label: "Instruction following" },
  { key: "clarity", label: "Clarity" },
];

export type ReviewSubmission = {
  id: string;
  version: number;
  durationSeconds: number | null;
  submittedAt: string;
  prompt: string;
  responseA: string;
  responseB: string;
  preferred?: string;
  confidence?: number;
  justification?: string;
  flags?: Record<string, boolean>;
  goldAnswer: string | null;
};

export function ReviewWorkspace({ submission }: { submission: ReviewSubmission }) {
  const [state, formAction, pending] = useActionState(recordReview, initialState);
  const [decision, setDecision] = useState<string>("");
  const [feedback, setFeedback] = useState("");
  const [confidence, setConfidence] = useState(0.8);
  const [categories, setCategories] = useState<string[]>([]);

  const needsFeedback = decision !== "" && decision !== "APPROVED";
  const blocked = !decision || (needsFeedback && feedback.trim().length < 15);

  const toggle = (c: string) =>
    setCategories((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-3">
      <input type="hidden" name="submissionId" value={submission.id} />
      <input type="hidden" name="decision" value={decision} />
      <input type="hidden" name="confidence" value={confidence} />
      <input type="hidden" name="severity" value={categories.join(", ")} />

      <div className="space-y-4 lg:col-span-2">
        <div className="flex items-center gap-2 rounded-lg border border-border bg-muted/40 p-3 text-xs text-muted-foreground">
          <EyeOff className="size-4 shrink-0" />
          Blind review — the trainer&apos;s identity is withheld so your judgment isn&apos;t
          influenced by who did the work.
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Prompt</p>
          <p className="mt-1.5 text-sm">{submission.prompt}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {(["A", "B"] as const).map((side) => (
            <div key={side}
              className={cn("rounded-xl border p-4",
                submission.preferred === side ? "border-primary bg-accent" : "border-border bg-card")}>
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground">Response {side}</span>
                {submission.preferred === side ? <Badge>Trainer picked</Badge> : null}
              </div>
              <p className="mt-2 text-sm leading-relaxed">
                {side === "A" ? submission.responseA : submission.responseB}
              </p>
            </div>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium">Trainer&apos;s justification</p>
          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
            {submission.justification || "No justification provided."}
          </p>
          {submission.flags && Object.values(submission.flags).some(Boolean) ? (
            <div className="mt-3 flex flex-wrap gap-1.5">
              {Object.entries(submission.flags)
                .filter(([, v]) => v)
                .map(([k]) => <Badge key={k} variant="warning">{k} flagged</Badge>)}
            </div>
          ) : null}
        </div>

        {submission.goldAnswer ? (
          <div className="rounded-xl border border-info/40 bg-info/10 p-5">
            <p className="text-sm font-medium">Gold answer (hidden from the trainer)</p>
            <p className="mt-2 text-sm text-muted-foreground">{submission.goldAnswer}</p>
            <p className="mt-2 text-xs text-muted-foreground">
              This is a benchmark task — your decision is recorded as a calibration signal.
            </p>
          </div>
        ) : null}

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium">Score the submission</p>
          <div className="mt-4 space-y-3">
            {SCORE_CATEGORIES.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-4">
                <Label htmlFor={`score_${c.key}`} className="text-sm font-normal">{c.label}</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className="cursor-pointer">
                      <input type="radio" name={`score_${c.key}`} value={n} defaultChecked={n === 4} className="peer sr-only" />
                      <span className="flex size-7 items-center justify-center rounded-md border border-input text-xs peer-checked:border-primary peer-checked:bg-primary peer-checked:text-primary-foreground">
                        {n}
                      </span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <div className="sticky top-4 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Version</span><span>v{submission.version}</span></div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-muted-foreground">Time on task</span>
              <span className="font-mono tabular-nums">
                {submission.durationSeconds ? `${Math.floor(submission.durationSeconds / 60)}m ${submission.durationSeconds % 60}s` : "—"}
              </span>
            </div>
            <div className="mt-1.5 flex justify-between">
              <span className="text-muted-foreground">Trainer confidence</span>
              <span>{submission.confidence ?? "—"}/5</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <p className="text-sm font-medium">Decision</p>
            <div className="mt-3 grid gap-2">
              {DECISIONS.map((d) => {
                const Icon = d.icon;
                return (
                  <button key={d.value} type="button" onClick={() => setDecision(d.value)}
                    className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                      decision === d.value ? d.tone : "border-border text-foreground hover:border-primary")}>
                    <Icon className="size-4" /> {d.label}
                  </button>
                );
              })}
            </div>
          </div>

          {needsFeedback ? (
            <div className="rounded-xl border border-border bg-card p-5">
              <p className="text-sm font-medium">What went wrong?</p>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {ERROR_CATEGORIES.map((c) => (
                  <button key={c} type="button" onClick={() => toggle(c)}
                    className={cn("rounded-full border px-2.5 py-1 text-xs transition-colors",
                      categories.includes(c) ? "border-primary bg-accent" : "border-border hover:border-primary")}>
                    {c}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-xl border border-border bg-card p-5">
            <Label htmlFor="feedback">Feedback to the trainer</Label>
            <Textarea id="feedback" name="feedback" rows={5} className="mt-2" value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder={needsFeedback ? "Required — be specific and actionable." : "Optional for approvals."} />
            {needsFeedback ? (
              <p className="mt-1.5 text-xs text-muted-foreground">
                {feedback.trim().length} / 15 characters minimum
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <Label htmlFor="conf">Your confidence</Label>
            <input id="conf" type="range" min={0.1} max={1} step={0.1} value={confidence}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--primary)]" />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Unsure</span><span>{Math.round(confidence * 100)}%</span><span>Certain</span>
            </div>
          </div>

          {state.status === "error" && state.message ? (
            <p className="text-xs text-destructive">{state.message}</p>
          ) : null}

          <Button type="submit" variant="violet" className="w-full" disabled={pending || blocked}>
            {pending ? "Submitting…" : "Submit review"}
          </Button>
        </div>
      </div>
    </form>
  );
}
