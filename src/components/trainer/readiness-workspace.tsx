"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { CheckCircle2, XCircle, Send } from "lucide-react";

import { submitReadinessTask, type ReadinessActionState } from "@/server/actions/readiness";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils/cn";

const initialState: ReadinessActionState = { status: "idle" };

export function ReadinessWorkspace({
  taskId,
  skill,
  prompt,
  responseA,
  responseB,
  existing,
  nextTaskId,
}: {
  taskId: string;
  skill: string;
  prompt: string;
  responseA: string;
  responseB: string;
  existing?: { choice: string; correct: boolean; correctChoice: string; guidance: string };
  /** The next unfinished task in the program, if any — for the "Continue" link after submitting. */
  nextTaskId?: string;
}) {
  const [state, formAction, pending] = useActionState(submitReadinessTask, initialState);
  const [choice, setChoice] = useState<"A" | "B" | null>(null);

  const result = state.status === "success" ? state.result : existing;

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-border bg-card p-5">
        <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{skill}</p>
        <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed">{prompt}</p>
      </div>

      <form action={formAction} className="grid gap-4 md:grid-cols-2">
        <input type="hidden" name="taskId" value={taskId} />
        <input type="hidden" name="choice" value={choice ?? ""} />

        {(["A", "B"] as const).map((letter) => {
          const text = letter === "A" ? responseA : responseB;
          const isChosen = result ? result.choice === letter : choice === letter;
          const isCorrectAnswer = result && result.correctChoice === letter;

          return (
            <button
              key={letter}
              type="button"
              disabled={Boolean(result)}
              onClick={() => setChoice(letter)}
              className={cn(
                "flex flex-col gap-2 rounded-xl border p-5 text-left text-sm transition-colors",
                result
                  ? isCorrectAnswer
                    ? "border-success bg-success/10"
                    : isChosen
                      ? "border-destructive bg-destructive/10"
                      : "border-border opacity-60"
                  : isChosen
                    ? "border-primary bg-primary/5"
                    : "border-border hover:border-primary"
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Response {letter}
                </span>
                {result && isCorrectAnswer ? <CheckCircle2 className="size-4 text-success" /> : null}
                {result && isChosen && !isCorrectAnswer ? <XCircle className="size-4 text-destructive" /> : null}
              </div>
              <p className="whitespace-pre-wrap leading-relaxed">{text}</p>
            </button>
          );
        })}

        {!result ? (
          <div className="md:col-span-2 space-y-2">
            {state.status === "error" && state.message ? (
              <p className="text-xs text-destructive">{state.message}</p>
            ) : null}
            <Button type="submit" variant="violet" disabled={pending || !choice}>
              <Send className="size-4" />
              {pending ? "Submitting…" : "Submit"}
            </Button>
          </div>
        ) : null}
      </form>

      {result ? (
        <div
          className={cn(
            "rounded-xl border p-5 text-sm",
            result.correct ? "border-success/40 bg-success/10" : "border-warning/40 bg-warning/10"
          )}
        >
          <p className="font-medium">
            {result.correct ? "Correct — Response " + result.correctChoice + " was the better choice." : `Not quite — Response ${result.correctChoice} was the better choice.`}
          </p>
          <p className="mt-1.5 text-muted-foreground">{result.guidance}</p>
          <div className="mt-4">
            {nextTaskId ? (
              <Button variant="violet" size="sm" asChild>
                <Link href={`/trainer/readiness/${nextTaskId}`}>Next task</Link>
              </Button>
            ) : (
              <Button variant="violet" size="sm" asChild>
                <Link href="/trainer/readiness">Back to readiness program</Link>
              </Button>
            )}
          </div>
        </div>
      ) : null}
    </div>
  );
}
