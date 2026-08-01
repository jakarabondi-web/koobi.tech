"use client";

import { useActionState } from "react";

import { assignTicketAction, updateTicketStatusAction, type ActionState } from "@/server/actions/support";
import { Button } from "@/components/ui/button";

const initial: ActionState = { status: "idle" };

const STATUS_OPTIONS = [
  "OPEN", "ASSIGNED", "WAITING_FOR_TRAINER", "WAITING_FOR_CLIENT", "ESCALATED", "RESOLVED", "CLOSED",
] as const;

export function TicketActions({
  ticketId,
  currentUserId,
  currentStatus,
  isAssigned,
  agents,
}: {
  ticketId: string;
  currentUserId: string;
  currentStatus: string;
  isAssigned: boolean;
  agents: { id: string; name: string }[];
}) {
  const [assignState, assignAction, assignPending] = useActionState(assignTicketAction, initial);
  const [statusState, statusAction, statusPending] = useActionState(updateTicketStatusAction, initial);

  return (
    <div className="flex flex-col items-end gap-1.5">
      {!isAssigned ? (
        <form action={assignAction} className="flex items-center gap-1.5">
          <input type="hidden" name="ticketId" value={ticketId} />
          <input type="hidden" name="assigneeId" value={currentUserId} />
          <Button type="submit" size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={assignPending}>
            {assignPending ? "Claiming…" : "Claim"}
          </Button>
        </form>
      ) : agents.length > 0 ? (
        <form action={assignAction} className="flex items-center gap-1.5">
          <input type="hidden" name="ticketId" value={ticketId} />
          <select
            name="assigneeId"
            defaultValue=""
            className="h-7 rounded-md border border-input bg-background px-1.5 text-xs"
          >
            <option value="" disabled>Reassign…</option>
            {agents.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
          <Button type="submit" size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={assignPending}>
            Go
          </Button>
        </form>
      ) : null}

      <form action={statusAction} className="flex items-center gap-1.5">
        <input type="hidden" name="ticketId" value={ticketId} />
        <select
          name="status"
          defaultValue={currentStatus}
          className="h-7 rounded-md border border-input bg-background px-1.5 text-xs"
        >
          {STATUS_OPTIONS.map((s) => <option key={s} value={s}>{s.replace(/_/g, " ").toLowerCase()}</option>)}
        </select>
        <Button type="submit" size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={statusPending}>
          Set
        </Button>
      </form>

      {assignState.status === "error" ? <p className="text-xs text-destructive">{assignState.message}</p> : null}
      {statusState.status === "error" ? <p className="text-xs text-destructive">{statusState.message}</p> : null}
    </div>
  );
}
