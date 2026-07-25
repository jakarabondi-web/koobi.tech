"use client";

import { useActionState } from "react";

import { applyToProject, type ActionState } from "@/server/actions/projects";
import { Button } from "@/components/ui/button";

const initialState: ActionState = { status: "idle" };

export function ApplyButton({ projectId, alreadyApplied }: { projectId: string; alreadyApplied: boolean }) {
  const [state, formAction, pending] = useActionState(applyToProject, initialState);

  if (alreadyApplied || state.status === "success") {
    return (
      <div className="space-y-1.5">
        <Button disabled className="w-full">Application submitted</Button>
        {state.message ? <p className="text-xs text-success">{state.message}</p> : null}
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-1.5">
      <input type="hidden" name="projectId" value={projectId} />
      <Button type="submit" variant="violet" className="w-full" disabled={pending}>
        {pending ? "Applying…" : "Apply to this project"}
      </Button>
      {state.status === "error" && state.message ? (
        <p className="text-xs text-destructive">{state.message}</p>
      ) : null}
    </form>
  );
}
