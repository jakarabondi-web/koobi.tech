"use client";

import { useActionState } from "react";
import { Pause, Play, CheckCircle2 } from "lucide-react";

import { setProjectStatus, type ActionState } from "@/server/actions/client-projects";
import { Button } from "@/components/ui/button";

const initialState: ActionState = { status: "idle" };

export function ProjectStatusActions({ projectId, status }: { projectId: string; status: string }) {
  const [state, formAction, pending] = useActionState(setProjectStatus, initialState);

  const next =
    status === "ACTIVE"
      ? { value: "PAUSED", label: "Pause", icon: Pause }
      : status === "PAUSED" || status === "DRAFT"
        ? { value: "ACTIVE", label: "Activate", icon: Play }
        : null;

  if (!next) return null;
  const Icon = next.icon;

  return (
    <form action={formAction} className="flex items-center gap-2">
      <input type="hidden" name="projectId" value={projectId} />
      <input type="hidden" name="status" value={next.value} />
      {state.message ? (
        <span className={state.status === "error" ? "text-xs text-destructive" : "text-xs text-success"}>
          {state.message}
        </span>
      ) : null}
      <Button type="submit" size="sm" variant="outline" disabled={pending}>
        <Icon className="size-4" /> {pending ? "Saving…" : next.label}
      </Button>
      {status === "ACTIVE" ? (
        <Button type="submit" size="sm" variant="ghost" name="status" value="COMPLETED" disabled={pending}>
          <CheckCircle2 className="size-4" /> Complete
        </Button>
      ) : null}
    </form>
  );
}
