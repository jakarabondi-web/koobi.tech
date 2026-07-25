"use client";

import { useActionState } from "react";

import { beginAssessment, type ActionState } from "@/server/actions/assessments";
import { Button } from "@/components/ui/button";

const initialState: ActionState = { status: "idle" };

export function BeginAssessmentButton({
  assessmentId,
  resuming,
}: {
  assessmentId: string;
  resuming: boolean;
}) {
  const [state, formAction, pending] = useActionState(beginAssessment, initialState);

  return (
    <form action={formAction} className="space-y-1.5">
      <input type="hidden" name="assessmentId" value={assessmentId} />
      <Button type="submit" variant="violet" className="w-full" disabled={pending}>
        {pending ? "Loading…" : resuming ? "Resume assessment" : "Start assessment"}
      </Button>
      {state.status === "error" && state.message ? (
        <p className="text-xs text-destructive">{state.message}</p>
      ) : null}
    </form>
  );
}
