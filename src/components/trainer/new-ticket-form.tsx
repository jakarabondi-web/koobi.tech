"use client";

import { useActionState } from "react";
import { CheckCircle2 } from "lucide-react";

import { createTicket, type ActionState } from "@/server/actions/support";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ActionState = { status: "idle" };

const CATEGORIES = [
  ["ACCOUNT", "Account"], ["ASSESSMENT", "Assessment"], ["PROJECT_ACCESS", "Project access"],
  ["TASK_ISSUE", "Task issue"], ["QUALITY_APPEAL", "Quality appeal"], ["PAYMENT", "Payment"],
  ["TECHNICAL_ISSUE", "Technical issue"], ["SAFETY_CONCERN", "Safety concern"],
  ["DATA_PRIVACY", "Data privacy"], ["OTHER", "Other"],
] as const;

export function NewTicketForm() {
  const [state, formAction, pending] = useActionState(createTicket, initialState);

  if (state.status === "success") {
    return (
      <div className="flex items-center gap-3 rounded-lg border border-success/40 bg-success/10 p-4">
        <CheckCircle2 className="size-5 text-success" />
        <p className="text-sm">{state.message}</p>
      </div>
    );
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="category">Category</Label>
          <select id="category" name="category" required
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30">
            {CATEGORIES.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="subject">Subject</Label>
          <Input id="subject" name="subject" required placeholder="Short summary" />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="body">Details</Label>
        <Textarea id="body" name="body" rows={5} required placeholder="What happened, and what were you expecting?" />
      </div>
      {state.status === "error" && state.message ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <Button type="submit" variant="violet" disabled={pending}>{pending ? "Submitting…" : "Open ticket"}</Button>
    </form>
  );
}
