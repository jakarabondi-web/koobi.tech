import type { Metadata } from "next";
import { Code2, AlertTriangle, Webhook } from "lucide-react";

import { prisma } from "@/lib/db/prisma";
import { requireTenant } from "@/server/services/tenant";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "API & webhooks" };

const PLANNED_ENDPOINTS = [
  ["POST", "/api/v1/projects", "Create and list projects"],
  ["POST", "/api/v1/tasks", "Ingest tasks into a project"],
  ["GET", "/api/v1/tasks/:id", "Retrieve task status"],
  ["GET", "/api/v1/submissions", "Retrieve completed evaluations"],
  ["POST", "/api/v1/exports", "Trigger and fetch dataset exports"],
];

export default async function ClientApiPage() {
  const tenant = await requireTenant();

  const [keys, webhooks] = await Promise.all([
    prisma.apiKey.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { createdAt: "desc" } }),
    prisma.webhook.findMany({ where: { organizationId: tenant.organizationId }, orderBy: { createdAt: "desc" } }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="API & webhooks" description="Programmatic access to your projects and results." />

      <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
        <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
        <div>
          <p className="font-medium">API not yet available</p>
          <p className="text-muted-foreground">
            The versioned client API isn&apos;t implemented yet, so keys can&apos;t be issued. The
            endpoints below are the planned surface — see API.md for the contract.
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Planned endpoints</CardTitle>
          <CardDescription>Authenticated by organization-scoped API key, not session cookies.</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Method</TableHead><TableHead>Path</TableHead><TableHead>Purpose</TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {PLANNED_ENDPOINTS.map(([m, p, d]) => (
                <TableRow key={p + m}>
                  <TableCell><Badge variant="outline" className="font-mono text-[11px]">{m}</Badge></TableCell>
                  <TableCell className="font-mono text-xs">{p}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">{d}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">API keys</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {keys.length === 0 ? (
            <EmptyState icon={Code2} title="No API keys" description="Key issuance opens when the API ships." />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Name</TableHead><TableHead>Created</TableHead><TableHead>Last used</TableHead></TableRow></TableHeader>
              <TableBody>
                {keys.map((k) => (
                  <TableRow key={k.id}>
                    <TableCell className="font-medium">{k.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{k.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{k.lastUsedAt?.toLocaleDateString() ?? "Never"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Webhooks</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {webhooks.length === 0 ? (
            <EmptyState icon={Webhook} title="No webhooks configured"
              description="Webhooks will notify your systems when exports are ready or task status changes." />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>URL</TableHead><TableHead>Events</TableHead><TableHead>Active</TableHead></TableRow></TableHeader>
              <TableBody>
                {webhooks.map((w) => (
                  <TableRow key={w.id}>
                    <TableCell className="font-mono text-xs">{w.url}</TableCell>
                    <TableCell className="text-xs">{w.events.join(", ")}</TableCell>
                    <TableCell>{w.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Off</Badge>}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
