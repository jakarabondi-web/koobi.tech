"use client";

import { useActionState } from "react";

import { inviteMember, type ActionState } from "@/server/actions/team";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: ActionState = { status: "idle" };

export function InviteMemberForm() {
  const [state, formAction, pending] = useActionState(inviteMember, initialState);

  return (
    <form action={formAction} className="flex flex-col gap-3 sm:flex-row sm:items-end">
      <div className="flex-1 space-y-1.5">
        <Label htmlFor="invite-email">Work email</Label>
        <Input id="invite-email" name="email" type="email" required placeholder="colleague@company.com" />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="invite-role">Role</Label>
        <select id="invite-role" name="role" defaultValue="MEMBER"
          className="h-9 rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30">
          <option value="MEMBER">Member</option>
          <option value="ADMIN">Admin</option>
          <option value="BILLING_OWNER">Billing owner</option>
        </select>
      </div>
      <Button type="submit" variant="violet" disabled={pending}>{pending ? "Sending…" : "Send invite"}</Button>
      {state.message ? (
        <p className={state.status === "error" ? "text-xs text-destructive" : "text-xs text-success"}>{state.message}</p>
      ) : null}
    </form>
  );
}
