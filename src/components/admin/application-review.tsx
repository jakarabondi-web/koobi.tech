"use client";

import { useActionState, useState } from "react";

import { decideApplication, type ActionState } from "@/server/actions/applications";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";

const initialState: ActionState = { status: "idle" };

type Decision = "APPROVED" | "REJECTED" | "WAITLISTED" | "ADDITIONAL_INFO_REQUIRED";

const COPY: Record<Decision, { label: string; title: string; desc: string; needsMessage: boolean }> = {
  APPROVED: {
    label: "Approve",
    title: "Approve this application?",
    desc: "The applicant gains access to the project marketplace and is emailed immediately.",
    needsMessage: false,
  },
  ADDITIONAL_INFO_REQUIRED: {
    label: "Request info",
    title: "Request more information",
    desc: "Your message is emailed to the applicant and shown on their dashboard.",
    needsMessage: true,
  },
  WAITLISTED: {
    label: "Waitlist",
    title: "Add to waitlist",
    desc: "The applicant is told there's no matching work right now, and that you'll follow up.",
    needsMessage: false,
  },
  REJECTED: {
    label: "Decline",
    title: "Decline this application",
    desc: "The applicant is emailed. Be specific but respectful — they'll read this.",
    needsMessage: true,
  },
};

function DecisionDialog({ applicationId, decision, applicantName }: {
  applicationId: string; decision: Decision; applicantName: string;
}) {
  const [state, formAction, pending] = useActionState(decideApplication, initialState);
  const [open, setOpen] = useState(false);
  const copy = COPY[decision];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant={decision === "APPROVED" ? "violet" : decision === "REJECTED" ? "outline" : "outline"}
        >
          {copy.label}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{applicantName} — {copy.desc}</DialogDescription>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <input type="hidden" name="applicationId" value={applicationId} />
          <input type="hidden" name="decision" value={decision} />
          <Textarea
            name="message"
            rows={3}
            required={copy.needsMessage}
            placeholder={copy.needsMessage ? "Message to the applicant (required)" : "Optional message to the applicant"}
          />
          {state.status === "error" && state.message ? (
            <p className="text-sm text-destructive">{state.message}</p>
          ) : null}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" variant={decision === "REJECTED" ? "destructive" : "violet"} disabled={pending}>
              {pending ? "Saving…" : copy.label}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function ApplicationReviewActions({ applicationId, applicantName }: {
  applicationId: string; applicantName: string;
}) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5">
      <DecisionDialog applicationId={applicationId} decision="APPROVED" applicantName={applicantName} />
      <DecisionDialog applicationId={applicationId} decision="ADDITIONAL_INFO_REQUIRED" applicantName={applicantName} />
      <DecisionDialog applicationId={applicationId} decision="WAITLISTED" applicantName={applicantName} />
      <DecisionDialog applicationId={applicationId} decision="REJECTED" applicantName={applicantName} />
    </div>
  );
}
