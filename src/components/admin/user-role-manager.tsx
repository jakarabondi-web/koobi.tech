"use client";

import { useActionState, useState } from "react";
import { X, Plus } from "lucide-react";

import { grantRole, revokeRole, setUserStatus, type ActionState } from "@/server/actions/users";
import { GLOBAL_ROLES, type GlobalRole } from "@/lib/permissions/roles";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const initialState: ActionState = { status: "idle" };

function label(role: string) {
  return role.replace(/_/g, " ").toLowerCase();
}

export function UserRoleManager({
  userId,
  roles,
  status,
  canManage,
}: {
  userId: string;
  roles: GlobalRole[];
  status: string;
  canManage: boolean;
}) {
  const [grantState, grantAction, granting] = useActionState(grantRole, initialState);
  const [, revokeAction] = useActionState(revokeRole, initialState);
  const [, statusAction] = useActionState(setUserStatus, initialState);
  const [open, setOpen] = useState(false);

  const available = GLOBAL_ROLES.filter((r) => !roles.includes(r));

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {roles.map((r) => (
        <Badge key={r} variant="secondary" className="gap-1">
          {label(r)}
          {canManage ? (
            <form action={revokeAction} className="inline">
              <input type="hidden" name="userId" value={userId} />
              <input type="hidden" name="role" value={r} />
              <button
                type="submit"
                aria-label={`Remove ${label(r)} role`}
                className="ml-0.5 rounded-full hover:text-destructive"
              >
                <X className="size-3" />
              </button>
            </form>
          ) : null}
        </Badge>
      ))}

      {canManage ? (
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm" variant="ghost" className="h-6 gap-1 px-2 text-xs">
              <Plus className="size-3" /> Role
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Grant a role</DialogTitle>
              <DialogDescription>
                Roles determine which portal and actions this person can access. Changes are audit-logged.
              </DialogDescription>
            </DialogHeader>
            <form action={grantAction} className="space-y-4">
              <input type="hidden" name="userId" value={userId} />
              <select
                name="role"
                className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
              >
                {available.map((r) => (
                  <option key={r} value={r}>
                    {label(r)}
                  </option>
                ))}
              </select>
              {grantState.message ? (
                <p
                  className={
                    grantState.status === "error" ? "text-sm text-destructive" : "text-sm text-success"
                  }
                >
                  {grantState.message}
                </p>
              ) : null}
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" disabled={granting || available.length === 0}>
                  {granting ? "Granting…" : "Grant role"}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      ) : null}

      {canManage ? (
        <form action={statusAction} className="inline">
          <input type="hidden" name="userId" value={userId} />
          <input type="hidden" name="status" value={status === "SUSPENDED" ? "ACTIVE" : "SUSPENDED"} />
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs text-muted-foreground">
            {status === "SUSPENDED" ? "Reinstate" : "Suspend"}
          </Button>
        </form>
      ) : null}
    </div>
  );
}
