"use client";

import { useActionState, useEffect, useState } from "react";
import { AlertTriangle, Save, Send, SkipForward } from "lucide-react";

import { submitTask, type ActionState } from "@/server/actions/tasks";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils/cn";

const initialState: ActionState = { status: "idle" };

export const SCORE_CATEGORIES = [
  { key: "correctness", label: "Correctness" },
  { key: "relevance", label: "Relevance" },
  { key: "instruction_following", label: "Instruction following" },
  { key: "clarity", label: "Clarity" },
  { key: "completeness", label: "Completeness" },
  { key: "safety", label: "Safety" },
] as const;

export type PairwisePayload = {
  prompt: string;
  responseA: string;
  responseB: string;
};

export function PairwiseWorkspace({
  taskId,
  payload,
  readOnly,
  existing,
}: {
  taskId: string;
  payload: PairwisePayload;
  readOnly: boolean;
  existing?: { preferred?: string; confidence?: number; justification?: string };
}) {
  const [state, formAction, pending] = useActionState(submitTask, initialState);

  // Draft state is initialised lazily from localStorage rather than restored
  // in an effect. Reading during initialisation avoids the cascading re-render
  // an effect-based restore would cause, and `typeof window` keeps it inert
  // during SSR — the server render always uses the submitted/empty values.
  const [draft, setDraft] = useState(() => {
    const base = {
      preferred: existing?.preferred ?? "",
      confidence: existing?.confidence ?? 3,
      justification: existing?.justification ?? "",
    };
    if (typeof window === "undefined" || readOnly || existing) return base;
    try {
      const raw = window.localStorage.getItem(`traivr:draft:${taskId}`);
      if (!raw) return base;
      const saved = JSON.parse(raw) as Partial<typeof base>;
      return {
        preferred: saved.preferred ?? base.preferred,
        confidence: saved.confidence ?? base.confidence,
        justification: saved.justification ?? base.justification,
      };
    } catch {
      // A corrupt draft should never block the workspace from loading.
      return base;
    }
  });

  const { preferred, confidence, justification } = draft;
  const setPreferred = (v: string) => setDraft((d) => ({ ...d, preferred: v }));
  const setConfidence = (v: number) => setDraft((d) => ({ ...d, confidence: v }));
  const setJustification = (v: string) => setDraft((d) => ({ ...d, justification: v }));

  const [elapsed, setElapsed] = useState(0);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  // Task duration is recorded with the submission — it feeds the quality
  // model, and implausibly fast work is a fraud signal.
  useEffect(() => {
    if (readOnly) return;
    const t = setInterval(() => setElapsed((e) => e + 1), 1000);
    return () => clearInterval(t);
  }, [readOnly]);

  // Local autosave so a refresh or crash doesn't lose written work.
  useEffect(() => {
    if (readOnly) return;
    const draft = { preferred, confidence, justification };
    const t = setTimeout(() => {
      localStorage.setItem(`traivr:draft:${taskId}`, JSON.stringify(draft));
      setSavedAt(new Date().toLocaleTimeString());
    }, 800);
    return () => clearTimeout(t);
  }, [taskId, preferred, confidence, justification, readOnly]);

  useEffect(() => {
    if (state.status === "success") localStorage.removeItem(`traivr:draft:${taskId}`);
  }, [state.status, taskId]);

  const incomplete = !preferred || justification.trim().length < 20;
  const mins = String(Math.floor(elapsed / 60)).padStart(2, "0");
  const secs = String(elapsed % 60).padStart(2, "0");

  return (
    <form action={formAction} className="grid gap-6 lg:grid-cols-3">
      <input type="hidden" name="taskId" value={taskId} />
      <input type="hidden" name="durationSeconds" value={elapsed} />
      <input type="hidden" name="preferred" value={preferred} />
      <input type="hidden" name="confidence" value={confidence} />

      <div className="space-y-4 lg:col-span-2">
        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Prompt</p>
          <p className="mt-1.5 text-sm">{payload.prompt}</p>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          {(["A", "B"] as const).map((side) => (
            <button
              key={side}
              type="button"
              disabled={readOnly}
              onClick={() => setPreferred(side)}
              className={cn(
                "rounded-xl border p-4 text-left transition-colors",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                preferred === side ? "border-primary bg-accent" : "border-border bg-card",
                !readOnly && "hover:border-primary"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-muted-foreground">Response {side}</span>
                {preferred === side ? <Badge>Preferred</Badge> : null}
              </div>
              <p className="mt-2 text-sm leading-relaxed">
                {side === "A" ? payload.responseA : payload.responseB}
              </p>
            </button>
          ))}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <Label htmlFor="justification">Why did you prefer that response?</Label>
          <Textarea
            id="justification"
            name="justification"
            rows={4}
            className="mt-2"
            disabled={readOnly}
            value={justification}
            onChange={(e) => setJustification(e.target.value)}
            placeholder="Point to what specifically makes it better — accuracy, completeness, reasoning, tone…"
          />
          <p className="mt-1.5 text-xs text-muted-foreground">
            {justification.trim().length} characters — at least 20 required.
          </p>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <p className="text-sm font-medium">Rubric scores</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Rate the response you preferred, 1 (poor) to 5 (excellent).
          </p>
          <div className="mt-4 space-y-3">
            {SCORE_CATEGORIES.map((c) => (
              <div key={c.key} className="flex items-center justify-between gap-4">
                <Label htmlFor={`score_${c.key}`} className="text-sm font-normal">{c.label}</Label>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <label key={n} className="cursor-pointer">
                      <input
                        type="radio"
                        name={`score_${c.key}`}
                        value={n}
                        defaultChecked={n === 3}
                        disabled={readOnly}
                        className="peer sr-only"
                      />
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
          <div className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Time on task</span>
              <span className="font-mono tabular-nums">{mins}:{secs}</span>
            </div>
            {savedAt ? (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-muted-foreground">
                <Save className="size-3" /> Draft saved {savedAt}
              </p>
            ) : null}
          </div>

          <div className="rounded-xl border border-border bg-card p-5">
            <Label htmlFor="confidence">Confidence</Label>
            <input
              id="confidence"
              type="range"
              min={1}
              max={5}
              value={confidence}
              disabled={readOnly}
              onChange={(e) => setConfidence(Number(e.target.value))}
              className="mt-2 w-full accent-[var(--primary)]"
            />
            <div className="flex justify-between text-[11px] text-muted-foreground">
              <span>Unsure</span><span>Certain</span>
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-2">
            <p className="text-sm font-medium">Flags</p>
            {[
              ["flag_safety", "Safety concern"],
              ["flag_factuality", "Factual error"],
              ["flag_citation", "Citation problem"],
            ].map(([name, label]) => (
              <label key={name} className="flex items-center gap-2 text-sm">
                <input type="checkbox" name={name} disabled={readOnly} className="size-4 rounded border-input" />
                {label}
              </label>
            ))}
          </div>

          {!readOnly ? (
            <div className="space-y-2">
              {incomplete ? (
                <p className="flex items-start gap-1.5 text-xs text-warning-foreground">
                  <AlertTriangle className="mt-0.5 size-3 shrink-0" />
                  Choose a response and write at least 20 characters of justification.
                </p>
              ) : null}
              {state.status === "error" && state.message ? (
                <p className="text-xs text-destructive">{state.message}</p>
              ) : null}
              {state.status === "success" && state.message ? (
                <p className="text-xs text-success">{state.message}</p>
              ) : null}
              <Button type="submit" variant="violet" className="w-full" disabled={pending || incomplete}>
                <Send className="size-4" />
                {pending ? "Submitting…" : "Submit task"}
              </Button>
              <Button type="button" variant="outline" className="w-full" disabled>
                <SkipForward className="size-4" /> Skip task
              </Button>
            </div>
          ) : (
            <p className="rounded-lg bg-muted p-3 text-xs text-muted-foreground">
              This task has been submitted and is read-only.
            </p>
          )}
        </div>
      </div>
    </form>
  );
}
