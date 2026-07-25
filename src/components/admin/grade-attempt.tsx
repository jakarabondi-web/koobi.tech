"use client";

import { useActionState, useState } from "react";

import { gradeAttempt, type ActionState } from "@/server/actions/grade-assessment";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const initialState: ActionState = { status: "idle" };

export function GradeAttemptActions({
  attemptId, candidateName, answers,
}: {
  attemptId: string;
  candidateName: string;
  answers: { prompt: string; answer: string }[];
}) {
  const [state, formAction, pending] = useActionState(gradeAttempt, initialState);
  const [open, setOpen] = useState(false);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild><Button size="sm" variant="violet">Grade</Button></DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Grade written answers — {candidateName}</DialogTitle>
          <DialogDescription>
            The auto-graded section already passed. Judge the written answers on reasoning, not
            length or polish.
          </DialogDescription>
        </DialogHeader>

        <div className="max-h-72 space-y-4 overflow-y-auto">
          {answers.length === 0 ? (
            <p className="text-sm text-muted-foreground">No written answers recorded.</p>
          ) : answers.map((a, i) => (
            <div key={i} className="rounded-lg border border-border p-3">
              <p className="text-xs font-medium text-muted-foreground">{a.prompt}</p>
              <p className="mt-1.5 text-sm">{a.answer || <span className="text-muted-foreground">No answer given.</span>}</p>
            </div>
          ))}
        </div>

        <form action={formAction} className="space-y-3">
          <input type="hidden" name="attemptId" value={attemptId} />
          <Textarea name="note" rows={2} placeholder="Feedback for the candidate (optional)" />
          {state.status === "error" && state.message ? (
            <p className="text-sm text-destructive">{state.message}</p>
          ) : null}
          <DialogFooter>
            <Button type="submit" name="pass" value="false" variant="outline" disabled={pending}>
              Fail
            </Button>
            <Button type="submit" name="pass" value="true" variant="violet" disabled={pending}>
              {pending ? "Saving…" : "Pass"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
