"use client";

import { useActionState, useState } from "react";
import { Check, Copy, ShieldAlert, Webhook as WebhookIcon } from "lucide-react";

import { createWebhook, deleteWebhook, type WebhookState } from "@/server/actions/webhooks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const initial: WebhookState = { status: "idle" };

/** Kept in sync with server/actions/webhooks.ts AVAILABLE_EVENTS by hand —
 *  there are only ever one or two of these, so a shared constants module
 *  would be more indirection than the duplication it avoids. */
const AVAILABLE_EVENTS = [
  { value: "task.reviewed", label: "task.reviewed — fires when a reviewer approves, rejects, or requests revision" },
  { value: "export.ready", label: "export.ready — fires when a requested dataset export finishes processing" },
];

export type WebhookRow = {
  id: string;
  url: string;
  events: string[];
  isActive: boolean;
};

function RevealedSecret({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-lg border border-success/40 bg-success/10 p-4">
      <p className="text-sm font-medium">Copy your signing secret now</p>
      <p className="mt-1 text-sm text-muted-foreground">
        Use it to verify the <code className="font-mono text-xs">X-Traivr-Signature</code> header
        (HMAC-SHA256 of the raw request body). It won&apos;t be shown again — delete and re-add the
        webhook if you lose it.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <code className="flex-1 overflow-x-auto rounded-md border border-border bg-background px-3 py-2 font-mono text-xs">
          {value}
        </code>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={async () => {
            await navigator.clipboard.writeText(value);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          }}
        >
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />}
          {copied ? "Copied" : "Copy"}
        </Button>
      </div>
    </div>
  );
}

export function WebhookManager({ webhooks, canManage }: { webhooks: WebhookRow[]; canManage: boolean }) {
  const [createState, createAction, creating] = useActionState(createWebhook, initial);
  const [deleteState, deleteAction, deleting] = useActionState(deleteWebhook, initial);

  return (
    <div className="space-y-5">
      {createState.status === "success" && createState.plaintextSecret ? (
        <RevealedSecret value={createState.plaintextSecret} />
      ) : null}
      {createState.status === "error" ? (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <ShieldAlert className="size-4" />
          {createState.message}
        </p>
      ) : null}
      {deleteState.message ? (
        <p className={deleteState.status === "error" ? "text-sm text-destructive" : "text-sm text-muted-foreground"}>
          {deleteState.message}
        </p>
      ) : null}

      {canManage ? (
        <form action={createAction} className="space-y-3 rounded-lg border border-border p-4">
          <div>
            <Label htmlFor="webhook-url">Endpoint URL</Label>
            <Input
              id="webhook-url"
              name="url"
              type="url"
              placeholder="https://yourapp.example.com/webhooks/traivr"
              required
            />
          </div>
          <div className="space-y-1.5">
            <Label>Events</Label>
            {AVAILABLE_EVENTS.map((e) => (
              <label key={e.value} className="flex items-start gap-2 text-sm text-muted-foreground">
                <input
                  type="checkbox"
                  name="events"
                  value={e.value}
                  defaultChecked
                  className="mt-0.5 size-4 shrink-0 rounded border-input accent-primary"
                />
                <span>{e.label}</span>
              </label>
            ))}
          </div>
          <Button type="submit" disabled={creating}>
            <WebhookIcon className="size-4" />
            {creating ? "Adding…" : "Add webhook"}
          </Button>
        </form>
      ) : (
        <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Only organization admins can configure webhooks.
        </p>
      )}

      {webhooks.length === 0 ? (
        <p className="text-sm text-muted-foreground">No webhooks configured.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>URL</TableHead>
              <TableHead>Events</TableHead>
              <TableHead>Status</TableHead>
              {canManage ? <TableHead className="text-right">Actions</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {webhooks.map((w) => (
              <TableRow key={w.id}>
                <TableCell className="font-mono text-xs">{w.url}</TableCell>
                <TableCell className="text-xs">{w.events.join(", ")}</TableCell>
                <TableCell>
                  {w.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Off</Badge>}
                </TableCell>
                {canManage ? (
                  <TableCell className="text-right">
                    <form action={deleteAction} className="inline">
                      <input type="hidden" name="webhookId" value={w.id} />
                      <Button type="submit" size="sm" variant="ghost" disabled={deleting}>
                        Remove
                      </Button>
                    </form>
                  </TableCell>
                ) : null}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
