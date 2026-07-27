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

function DecisionDialog({ applicationId, decision, applicantName, disabled, disabledReason }: {
  applicationId: string;
  decision: Decision;
  applicantName: string;
  /** Approve only: blocked until the assessment is passed and identity verified. */
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [state, formAction, pending] = useActionState(decideApplication, initialState);
  const [open, setOpen] = useState(false);
  const copy = COPY[decision];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <span title={disabled ? disabledReason : undefined}>
          <Button
            size="sm"
            variant={decision === "APPROVED" ? "violet" : decision === "REJECTED" ? "outline" : "outline"}
            disabled={disabled}
          >
            {copy.label}
          </Button>
        </span>
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

export function ApplicationReviewActions({ applicationId, applicantName, readyForApproval }: {
  applicationId: string;
  applicantName: string;
  /**
   * Mirrors what decideApplication enforces server-side — disabling the
   * button here is purely so a reviewer sees why before they click, not what
   * stops the approval. That happens in the action regardless of this prop.
   */
  readyForApproval: boolean;
}) {
  return (
    <div className="flex flex-col items-end gap-1">
      <div className="flex flex-wrap justify-end gap-1.5">
        <DecisionDialog
          applicationId={applicationId}
          decision="APPROVED"
          applicantName={applicantName}
          disabled={!readyForApproval}
          disabledReason="Needs a passed assessment and verified identity before this can be approved."
        />
        <DecisionDialog applicationId={applicationId} decision="ADDITIONAL_INFO_REQUIRED" applicantName={applicantName} />
        <DecisionDialog applicationId={applicationId} decision="WAITLISTED" applicantName={applicantName} />
        <DecisionDialog applicationId={applicationId} decision="REJECTED" applicantName={applicantName} />
      </div>
      {!readyForApproval ? (
        <p className="text-[11px] text-muted-foreground">Approve unlocks once both checks pass.</p>
      ) : null}
    </div>
  );
}
