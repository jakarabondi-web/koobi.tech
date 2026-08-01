import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldAlert, Globe } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { can } from "@/lib/permissions/can";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RiskFlagActions } from "@/components/admin/risk-flag-actions";

export const metadata: Metadata = { title: "Fraud alerts" };

export default async function FraudPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const canResolve = can(session.user.roles, "risk.resolve");

  const [flags, vpnSignals, counts] = await Promise.all([
    prisma.riskFlag.findMany({ include: { user: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.locationSignal.findMany({
      where: { OR: [{ isVpn: true }, { isProxy: true }, { isDatacenter: true }] },
      include: { user: true },
      orderBy: { observedAt: "desc" },
      take: 20,
    }),
    prisma.riskFlag.groupBy({ by: ["severity"], _count: true, where: { status: "OPEN" } }),
  ]);
  const sev = (s: string) => counts.find((c) => c.severity === s)?._count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Fraud & integrity"
        description="Risk signals for human review. No account is actioned automatically."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="High severity" value={String(sev("high"))} icon={ShieldAlert} trend={sev("high") > 0 ? "down" : "flat"} />
        <KpiCard label="Medium severity" value={String(sev("medium"))} />
        <KpiCard label="Low severity" value={String(sev("low"))} />
        <KpiCard label="VPN / proxy sightings" value={String(vpnSignals.length)} icon={Globe} />
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        A single signal is never sufficient grounds for enforcement. Corporate VPNs, shared offices,
        and ordinary travel all produce flags here. Investigate before acting, and record the reason.
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Risk flags</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {flags.length === 0 ? (
            <EmptyState icon={ShieldAlert} title="No risk flags" description="Detection signals will appear here for review." />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>User</TableHead><TableHead>Signal</TableHead><TableHead>Severity</TableHead>
                <TableHead>Raised</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {flags.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell>
                      <p className="font-medium">{f.user.firstName} {f.user.lastName}</p>
                      <p className="text-xs text-muted-foreground">{f.user.email}</p>
                    </TableCell>
                    <TableCell className="font-mono text-xs">{f.signal}</TableCell>
                    <TableCell><Badge variant={f.severity === "high" ? "destructive" : "warning"}>{f.severity}</Badge></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{f.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell><StatusBadge status={f.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" asChild><Link href={`/admin/trainers/${f.userId}`}>Investigate</Link></Button>
                        {canResolve && f.status === "OPEN" ? <RiskFlagActions flagId={f.id} /> : null}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">VPN / proxy sightings</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {vpnSignals.length === 0 ? <EmptyState title="None detected" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Country</TableHead><TableHead>Type</TableHead><TableHead>Seen</TableHead></TableRow></TableHeader>
              <TableBody>
                {vpnSignals.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell>{s.user.firstName} {s.user.lastName}</TableCell>
                    <TableCell>{s.countryCode ?? "—"}</TableCell>
                    <TableCell className="flex gap-1">
                      {s.isVpn ? <Badge variant="warning">VPN</Badge> : null}
                      {s.isProxy ? <Badge variant="warning">Proxy</Badge> : null}
                      {s.isDatacenter ? <Badge variant="warning">Datacenter</Badge> : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.observedAt.toLocaleDateString()}</TableCell>
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
