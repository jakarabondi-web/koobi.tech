"use client";

import { useActionState, useState } from "react";
import { Scale, CheckCircle2, RefreshCw, XCircle } from "lucide-react";

import { submitAdjudication, type ActionState } from "@/server/actions/adjudication";
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
] as const;

export type AdjudicationItem = {
  id: string;
  reason: string;
  projectName: string;
  prompt: string;
  responseA: string;
  responseB: string;
  preferred?: string;
  justification?: string;
  goldAnswer: string | null;
  reviews: Array<{ reviewer: string; decision: string; feedback: string | null; confidence: number | null }>;
};

export function AdjudicationPanel({ item }: { item: AdjudicationItem }) {
  const [state, formAction, pending] = useActionState(submitAdjudication, initialState);
  const [decision, setDecision] = useState("");
  const [notes, setNotes] = useState("");

  const blocked = !decision || notes.trim().length < 15;

  if (state.status === "success") {
    return (
      <div className="rounded-xl border border-success/40 bg-success/10 p-6 text-sm">
        <p className="font-medium">Resolved</p>
        <p className="mt-1 text-muted-foreground">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4 rounded-xl border border-border bg-card p-5">
      <input type="hidden" name="adjudicationId" value={item.id} />
      <input type="hidden" name="decision" value={decision} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold">{item.projectName}</p>
          <p className="text-xs text-muted-foreground">{item.prompt}</p>
        </div>
        <Badge variant={item.reason === "escalated" ? "warning" : "info"}>
          {item.reason === "escalated" ? "Escalated by reviewer" : "Reviewers disagreed"}
        </Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {(["A", "B"] as const).map((side) => (
          <div key={side}
            className={cn("rounded-lg border p-3 text-sm",
              item.preferred === side ? "border-primary bg-accent" : "border-border")}>
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-muted-foreground">Response {side}</span>
              {item.preferred === side ? <Badge>Trainer picked</Badge> : null}
            </div>
            <p className="mt-1.5 leading-relaxed">{side === "A" ? item.responseA : item.responseB}</p>
          </div>
        ))}
      </div>

      {item.justification ? (
        <div className="rounded-lg bg-muted/50 p-3 text-sm">
          <p className="text-xs font-medium text-muted-foreground">Trainer&apos;s justification</p>
          <p className="mt-1">{item.justification}</p>
        </div>
      ) : null}

      {item.goldAnswer ? (
        <div className="rounded-lg border border-info/40 bg-info/10 p-3 text-sm">
          <p className="text-xs font-medium">Gold answer</p>
          <p className="mt-1 text-muted-foreground">{item.goldAnswer}</p>
        </div>
      ) : null}

      <div className="rounded-lg border border-border p-3">
        <p className="text-xs font-medium text-muted-foreground">
          What the reviewers said ({item.reviews.length})
        </p>
        <ul className="mt-2 space-y-2">
          {item.reviews.map((r, i) => (
            <li key={i} className="text-sm">
              <div className="flex items-center gap-2">
                <Badge variant={r.decision === "APPROVED" ? "success" : r.decision === "REJECTED" ? "destructive" : "warning"}>
                  {r.decision.replace(/_/g, " ").toLowerCase()}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  {r.reviewer}
                  {r.confidence !== null ? ` · ${Math.round(r.confidence * 100)}% confident` : ""}
                </span>
              </div>
              {r.feedback ? <p className="mt-1 text-xs text-muted-foreground">{r.feedback}</p> : null}
            </li>
          ))}
        </ul>
      </div>

      <div>
        <p className="text-sm font-medium">Your decision is final</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DECISIONS.map((d) => {
            const Icon = d.icon;
            return (
              <button key={d.value} type="button" onClick={() => setDecision(d.value)}
                className={cn("flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                  decision === d.value ? d.tone : "border-border hover:border-primary")}>
                <Icon className="size-4" /> {d.label}
              </button>
            );
          })}
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor={`notes-${item.id}`}>Reasoning</Label>
        <Textarea id={`notes-${item.id}`} name="notes" rows={3} value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Both the reviewers and the trainer see this — it's how reviewers calibrate." />
        <p className="text-xs text-muted-foreground">{notes.trim().length} / 15 characters minimum</p>
      </div>

      {state.status === "error" && state.message ? (
        <p className="text-sm text-destructive">{state.message}</p>
      ) : null}

      <Button type="submit" variant="violet" disabled={pending || blocked}>
        <Scale className="size-4" /> {pending ? "Recording…" : "Record final decision"}
      </Button>
    </form>
  );
}
