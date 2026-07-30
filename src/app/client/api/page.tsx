import type { Metadata } from "next";

import { prisma } from "@/lib/db/prisma";
import { requireTenant } from "@/server/services/tenant";
import { PageHeader } from "@/components/shared/page-header";
import { ApiKeyManager } from "@/components/client/api-key-manager";
import { WebhookManager } from "@/components/client/webhook-manager";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "API & webhooks" };

const ENDPOINTS: [string, string, string, string][] = [
  ["GET", "/api/v1/projects", "List your projects", "read"],
  ["POST", "/api/v1/projects", "Create a project", "write"],
  ["GET", "/api/v1/projects/:id", "Project detail with task status counts", "read"],
  ["PATCH", "/api/v1/projects/:id", "Update a project", "write"],
  ["GET", "/api/v1/tasks?project_id=", "List tasks and their status", "read"],
  ["POST", "/api/v1/tasks", "Ingest tasks (idempotent on external_ref)", "write"],
  ["GET", "/api/v1/submissions?project_id=", "Retrieve completed evaluations", "read"],
  ["GET", "/api/v1/exports", "List dataset exports", "read"],
  ["POST", "/api/v1/exports", "Request a dataset export (jsonl or csv)", "write"],
  ["GET", "/api/v1/exports/:id", "Poll a single export", "read"],
  ["GET", "/api/v1/exports/:id/download", "Download a READY export's file", "read"],
];

export default async function ClientApiPage() {
  const tenant = await requireTenant();

  const [keys, webhooks] = await Promise.all([
    prisma.apiKey.findMany({
      where: { organizationId: tenant.organizationId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.webhook.findMany({
      where: { organizationId: tenant.organizationId },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="API & webhooks" description="Programmatic access to your projects and results." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">API keys</CardTitle>
          <CardDescription>
            Authenticate with <code className="font-mono text-xs">Authorization: Bearer &lt;key&gt;</code>. A key
            can only ever see {tenant.organizationName}&apos;s data.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <ApiKeyManager
            canManage={tenant.isOrgAdmin}
            keys={keys.map((k) => ({
              id: k.id,
              name: k.name,
              prefix: k.prefix,
              scopes: k.scopes,
              createdAt: k.createdAt.toISOString(),
              lastUsedAt: k.lastUsedAt?.toISOString() ?? null,
              expiresAt: k.expiresAt?.toISOString() ?? null,
              revokedAt: k.revokedAt?.toISOString() ?? null,
            }))}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Endpoints</CardTitle>
          <CardDescription>Version 1. Full request and response shapes are in API.md.</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Method</TableHead>
                  <TableHead>Path</TableHead>
                  <TableHead>Purpose</TableHead>
                  <TableHead>Scope</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {ENDPOINTS.map(([m, p, d, scope]) => (
                  <TableRow key={p + m}>
                    <TableCell>
                      <Badge variant="outline" className="font-mono text-[11px]">{m}</Badge>
                    </TableCell>
                    <TableCell className="font-mono text-xs whitespace-nowrap">{p}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{d}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{scope}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>

          <div className="mt-5 rounded-lg border border-border bg-muted/40 p-4">
            <p className="text-xs font-medium text-muted-foreground">Example</p>
            <pre className="mt-2 overflow-x-auto text-xs leading-relaxed">
              <code>{`curl https://traivr.com/api/v1/projects \\
  -H "Authorization: Bearer tra_live_..."`}</code>
            </pre>
          </div>

          <p className="mt-4 text-sm text-muted-foreground">
            Everything on this list is live. Exports are processed synchronously — the response to{" "}
            <code className="font-mono text-xs">POST /api/v1/exports</code> already carries the final
            status and download URL.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Webhooks</CardTitle>
          <CardDescription>
            Delivered inline, best-effort — a delivery that fails isn&apos;t retried, so treat this as
            a push notification, not a guarantee. Live events:{" "}
            <code className="font-mono text-xs">task.reviewed</code> and{" "}
            <code className="font-mono text-xs">export.ready</code>.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <WebhookManager
            canManage={tenant.isOrgAdmin}
            webhooks={webhooks.map((w) => ({ id: w.id, url: w.url, events: w.events, isActive: w.isActive }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}
