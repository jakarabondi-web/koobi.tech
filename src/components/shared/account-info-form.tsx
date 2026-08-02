"use client";

import { useActionState, useState } from "react";
import { Pencil } from "lucide-react";

import {
  requestEmailChangeAction,
  updateNameAction,
  type ActionState,
  type EmailChangeState,
} from "@/server/actions/account";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

const nameInitial: ActionState = { status: "idle" };
const emailInitial: EmailChangeState = { status: "idle" };

function NameSection({
  firstName,
  lastName,
  displayName,
}: {
  firstName: string;
  lastName: string;
  displayName: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(updateNameAction, nameInitial);

  if (state.status === "success" && editing) setEditing(false);

  if (!editing) {
    return (
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium">{firstName} {lastName}</p>
          {displayName ? <p className="text-xs text-muted-foreground">Displayed as “{displayName}”</p> : null}
        </div>
        <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
          <Pencil className="size-3.5" /> Edit
        </Button>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="firstName">First name</Label>
          <Input id="firstName" name="firstName" defaultValue={firstName} required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lastName">Last name</Label>
          <Input id="lastName" name="lastName" defaultValue={lastName} required />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="displayName">Display name (optional)</Label>
        <Input id="displayName" name="displayName" defaultValue={displayName ?? ""} placeholder="Shown instead of your full name where relevant" />
      </div>
      {state.status === "error" ? <p className="text-sm text-destructive">{state.message}</p> : null}
      <div className="flex gap-2">
        <Button type="submit" size="sm" disabled={pending}>{pending ? "Saving…" : "Save"}</Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
      </div>
    </form>
  );
}

function EmailSection({
  email,
  verified,
  pendingEmail,
}: {
  email: string;
  verified: boolean;
  pendingEmail: string | null;
}) {
  const [editing, setEditing] = useState(false);
  const [state, action, pending] = useActionState(requestEmailChangeAction, emailInitial);

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm">{email}</span>
            {verified ? <Badge variant="success">Verified</Badge> : <Badge variant="warning">Unverified</Badge>}
          </div>
          {pendingEmail ? (
            <p className="mt-1 text-xs text-muted-foreground">
              Confirmation pending for <span className="font-medium">{pendingEmail}</span> — check that inbox.
            </p>
          ) : null}
        </div>
        {!editing ? (
          <Button type="button" size="sm" variant="outline" onClick={() => setEditing(true)}>
            Change email
          </Button>
        ) : null}
      </div>

      {editing ? (
        state.status === "success" ? (
          <p className="text-sm text-success">{state.message}</p>
        ) : (
          <form action={action} className="space-y-3 rounded-md border border-border bg-muted/30 p-3">
            <div className="space-y-1.5">
              <Label htmlFor="newEmail">New email address</Label>
              <Input id="newEmail" name="newEmail" type="email" required autoComplete="email" />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="currentPasswordForEmail">Confirm your password</Label>
              <Input id="currentPasswordForEmail" name="currentPassword" type="password" required autoComplete="current-password" />
            </div>
            {state.status === "error" ? <p className="text-sm text-destructive">{state.message}</p> : null}
            <div className="flex gap-2">
              <Button type="submit" size="sm" disabled={pending}>{pending ? "Sending…" : "Send confirmation link"}</Button>
              <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>Cancel</Button>
            </div>
          </form>
        )
      ) : null}
    </div>
  );
}

export function AccountInfoForm({
  firstName,
  lastName,
  displayName,
  email,
  emailVerified,
  pendingEmail,
}: {
  firstName: string;
  lastName: string;
  displayName: string | null;
  email: string;
  emailVerified: boolean;
  pendingEmail: string | null;
}) {
  return (
    <div className="space-y-5">
      <NameSection firstName={firstName} lastName={lastName} displayName={displayName} />
      <div className="h-px bg-border" />
      <EmailSection email={email} verified={emailVerified} pendingEmail={pendingEmail} />
    </div>
  );
}
