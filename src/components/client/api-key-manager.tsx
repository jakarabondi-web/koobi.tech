"use client";

import { useActionState, useState } from "react";
import { Check, Copy, KeyRound, ShieldAlert } from "lucide-react";

import { createApiKey, revokeApiKey, type KeyState } from "@/server/actions/api-keys";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const initial: KeyState = { status: "idle" };

export type KeyRow = {
  id: string;
  name: string;
  prefix: string;
  scopes: string[];
  createdAt: string;
  lastUsedAt: string | null;
  expiresAt: string | null;
  revokedAt: string | null;
};

/** Shown once, immediately after creation, and never re-rendered from the server. */
function RevealedKey({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);

  return (
    <div className="rounded-lg border border-success/40 bg-success/10 p-4">
      <p className="text-sm font-medium">Copy your key now</p>
      <p className="mt-1 text-sm text-muted-foreground">
        This is the only time it will be shown. We store a hash, not the key — if you lose it,
        revoke it and issue a new one.
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

export function ApiKeyManager({ keys, canManage }: { keys: KeyRow[]; canManage: boolean }) {
  const [createState, createAction, creating] = useActionState(createApiKey, initial);
  const [revokeState, revokeAction, revoking] = useActionState(revokeApiKey, initial);

  return (
    <div className="space-y-5">
      {createState.status === "success" && createState.plaintext ? (
        <RevealedKey value={createState.plaintext} />
      ) : null}

      {createState.status === "error" ? (
        <p className="flex items-center gap-2 text-sm text-destructive">
          <ShieldAlert className="size-4" />
          {createState.message}
        </p>
      ) : null}
      {revokeState.message ? (
        <p
          className={
            revokeState.status === "error"
              ? "text-sm text-destructive"
              : "text-sm text-muted-foreground"
          }
        >
          {revokeState.message}
        </p>
      ) : null}

      {canManage ? (
        <form action={createAction} className="grid gap-4 rounded-lg border border-border p-4 sm:grid-cols-4">
          <div className="sm:col-span-2">
            <Label htmlFor="key-name">Key name</Label>
            <Input id="key-name" name="name" placeholder="Production ingest" required minLength={2} maxLength={60} />
          </div>
          <div>
            <Label htmlFor="key-scope">Scope</Label>
            <select
              id="key-scope"
              name="scope"
              defaultValue="READ"
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="READ">Read only</option>
              <option value="WRITE">Read and write</option>
            </select>
          </div>
          <div>
            <Label htmlFor="key-env">Environment</Label>
            <select
              id="key-env"
              name="environment"
              defaultValue="live"
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="live">Live</option>
              <option value="test">Test</option>
            </select>
          </div>
          <div>
            <Label htmlFor="key-exp">Expires</Label>
            <select
              id="key-exp"
              name="expiresInDays"
              defaultValue="90"
              className="mt-1.5 h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
            >
              <option value="30">In 30 days</option>
              <option value="90">In 90 days</option>
              <option value="365">In a year</option>
              <option value="0">Never</option>
            </select>
          </div>
          <div className="flex items-end sm:col-span-4">
            <Button type="submit" disabled={creating}>
              <KeyRound className="size-4" />
              {creating ? "Creating…" : "Create key"}
            </Button>
          </div>
        </form>
      ) : (
        <p className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
          Only organization admins can issue or revoke API keys.
        </p>
      )}

      {keys.length === 0 ? (
        <p className="text-sm text-muted-foreground">No keys yet.</p>
      ) : (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Key</TableHead>
              <TableHead>Scope</TableHead>
              <TableHead>Last used</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {keys.map((k) => {
              const expired = k.expiresAt !== null && new Date(k.expiresAt) <= new Date();
              return (
                <TableRow key={k.id}>
                  <TableCell className="font-medium">{k.name}</TableCell>
                  <TableCell className="font-mono text-xs text-muted-foreground">{k.prefix || "—"}…</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-[11px]">
                      {k.scopes.includes("WRITE") ? "read + write" : "read"}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : "Never"}
                  </TableCell>
                  <TableCell>
                    {k.revokedAt ? (
                      <Badge variant="destructive">Revoked</Badge>
                    ) : expired ? (
                      <Badge variant="outline">Expired</Badge>
                    ) : (
                      <Badge variant="success">Active</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    {canManage && !k.revokedAt ? (
                      <form action={revokeAction} className="inline">
                        <input type="hidden" name="keyId" value={k.id} />
                        <Button type="submit" size="sm" variant="ghost" disabled={revoking}>
                          Revoke
                        </Button>
                      </form>
                    ) : null}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
