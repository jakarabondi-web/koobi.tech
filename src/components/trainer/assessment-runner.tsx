"use client";

import { useActionState, useEffect, useState } from "react";
import Link from "next/link";
import { Clock, Send } from "lucide-react";

import { finishAssessment, type ActionState } from "@/server/actions/assessments";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";

const initialState: ActionState = { status: "idle" };

export type RunnerQuestion = {
  id: string;
  type: string;
  prompt: string;
  options: string[];
  points: number;
};

export function AssessmentRunner({
  attemptId,
  questions,
  expiresAt,
}: {
  attemptId: string;
  questions: RunnerQuestion[];
  expiresAt: string | null;
}) {
  const [state, formAction, pending] = useActionState(finishAssessment, initialState);
  const [answered, setAnswered] = useState<Record<string, boolean>>({});
  const [remaining, setRemaining] = useState<number | null>(null);

  useEffect(() => {
    if (!expiresAt) return;
    const tick = () => {
      const ms = new Date(expiresAt).getTime() - Date.now();
      setRemaining(Math.max(0, Math.floor(ms / 1000)));
    };
    tick();
    const t = setInterval(tick, 1000);
    return () => clearInterval(t);
  }, [expiresAt]);

  const done = Object.values(answered).filter(Boolean).length;
  const pct = Math.round((done / questions.length) * 100);

  if (state.status === "success") {
    return (
      <div className="rounded-xl border border-border bg-card p-10 text-center">
        <p className="text-lg font-semibold">Assessment submitted</p>
        <p className="mt-2 text-sm text-muted-foreground">{state.message}</p>
        <Button className="mt-5" asChild>
          <Link href="/trainer/assessments">Back to assessments</Link>
        </Button>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-5">
      <input type="hidden" name="attemptId" value={attemptId} />

      <div className="sticky top-2 z-10 flex items-center gap-4 rounded-xl border border-border bg-card p-4 shadow-sm">
        <div className="flex-1">
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>{done} of {questions.length} answered</span><span>{pct}%</span>
          </div>
          <Progress value={pct} className="mt-1.5" />
        </div>
        {remaining !== null ? (
          <div className="flex items-center gap-1.5 text-sm font-mono tabular-nums">
            <Clock className="size-4 text-muted-foreground" />
            {String(Math.floor(remaining / 60)).padStart(2, "0")}:{String(remaining % 60).padStart(2, "0")}
          </div>
        ) : null}
      </div>

      {questions.map((q, i) => (
        <div key={q.id} className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start justify-between gap-3">
            <p className="text-sm font-medium">
              <span className="text-muted-foreground">{i + 1}.</span> {q.prompt}
            </p>
            <span className="shrink-0 text-xs text-muted-foreground">
              {q.points} {q.points === 1 ? "point" : "points"}
            </span>
          </div>

          {q.type === "MULTIPLE_CHOICE" ? (
            <div className="mt-3 space-y-2">
              {q.options.map((opt) => (
                <label
                  key={opt}
                  className="flex cursor-pointer items-start gap-2.5 rounded-md border border-input p-3 text-sm has-[:checked]:border-primary has-[:checked]:bg-accent"
                >
                  <input
                    type="radio"
                    name={`q_${q.id}`}
                    value={opt}
                    onChange={() => setAnswered((a) => ({ ...a, [q.id]: true }))}
                    className="mt-0.5 size-4"
                  />
                  <span>{opt}</span>
                </label>
              ))}
            </div>
          ) : (
            <div className="mt-3">
              <Label htmlFor={`q_${q.id}`} className="sr-only">Your answer</Label>
              <Textarea
                id={`q_${q.id}`}
                name={`q_${q.id}`}
                rows={5}
                onChange={(e) => setAnswered((a) => ({ ...a, [q.id]: e.target.value.trim().length > 0 }))}
                placeholder="Write your answer…"
              />
              <p className="mt-1.5 text-xs text-muted-foreground">
                Written answers are graded by a human reviewer.
              </p>
            </div>
          )}
        </div>
      ))}

      {state.status === "error" && state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <Button type="submit" variant="violet" size="lg" className="w-full" disabled={pending}>
        <Send className="size-4" />
        {pending ? "Submitting…" : "Submit assessment"}
      </Button>
    </form>
  );
}
