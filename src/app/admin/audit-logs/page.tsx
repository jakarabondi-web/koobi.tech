import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { FileClock, ShieldAlert } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { can } from "@/lib/permissions/can";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Audit logs" };

export default async function AuditLogsPage({
  searchParams,
}: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (!can(session.user.roles, "audit.view")) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
        <ShieldAlert className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">You don&apos;t have access to audit logs</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Audit access is limited to quality managers, operations managers, and super admins.
        </p>
      </div>
    );
  }

  const { q } = await searchParams;
  const logs = await prisma.auditLog.findMany({
    where: q ? { action: { contains: q, mode: "insensitive" } } : undefined,
    include: { actor: true },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Audit logs" description="Immutable record of sensitive actions across the platform." />

      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Filter by action…"
          className="h-9 max-w-sm flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30" />
        <Button type="submit" variant="outline" size="sm">Filter</Button>
      </form>

      <Card>
        <CardContent className="pt-6 pb-6">
          {logs.length === 0 ? (
            <EmptyState icon={FileClock} title="No audit entries"
              description="Approvals, payouts, and role changes are recorded here as they happen." />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Action</TableHead><TableHead>Actor</TableHead><TableHead>Entity</TableHead>
                <TableHead>Details</TableHead><TableHead>When</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {logs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell><Badge variant="outline" className="font-mono text-[11px]">{l.action}</Badge></TableCell>
                    <TableCell className="text-sm">{l.actor ? `${l.actor.firstName} ${l.actor.lastName}` : "System"}</TableCell>
                    <TableCell className="text-xs">{l.entityType}</TableCell>
                    <TableCell className="max-w-xs truncate font-mono text-[11px] text-muted-foreground">
                      {l.metadata ? JSON.stringify(l.metadata) : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.createdAt.toLocaleString()}</TableCell>
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
