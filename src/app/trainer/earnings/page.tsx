import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Wallet, TrendingUp, Clock, CheckCircle2 } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getWalletSummary } from "@/server/services/wallet";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Earnings" };

const usd = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function EarningsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const [wallet, earnings] = await Promise.all([
    getWalletSummary(userId),
    prisma.earning.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 50 }),
  ]);

  const projectIds = [...new Set(earnings.map((e) => e.projectId).filter(Boolean))] as string[];
  const projects = projectIds.length
    ? await prisma.project.findMany({ where: { id: { in: projectIds } }, select: { id: true, name: true } })
    : [];
  const nameFor = (id: string | null) => projects.find((p) => p.id === id)?.name ?? "—";

  const lifetime = earnings.reduce((s, e) => s + e.baseCents + e.bonusCents + e.adjustmentCents, 0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Earnings"
        description="Every task you complete, with what you were paid and why."
        actions={<Button variant="outline" asChild><Link href="/trainer/payments">Go to wallet</Link></Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Lifetime earnings" value={usd(lifetime)} icon={TrendingUp} />
        <KpiCard label="Available to withdraw" value={usd(wallet.availableCents)} icon={Wallet} trend="up" />
        <KpiCard label="Awaiting approval" value={usd(wallet.pendingCents)} icon={Clock} />
        <KpiCard label="Paid out" value={usd(wallet.paidCents)} icon={CheckCircle2} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Earnings history</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {earnings.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No earnings yet"
              description="Complete and pass review on your first tasks to start earning."
            />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Project</TableHead><TableHead>Tasks</TableHead>
                <TableHead>Base</TableHead><TableHead>Bonus</TableHead><TableHead>Adjustment</TableHead>
                <TableHead>Total</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {earnings.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-xs text-muted-foreground">{e.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell className="max-w-52 truncate">{nameFor(e.projectId)}</TableCell>
                    <TableCell className="tabular-nums">{e.taskCount}</TableCell>
                    <TableCell className="tabular-nums">{usd(e.baseCents)}</TableCell>
                    <TableCell className="tabular-nums text-success">{e.bonusCents ? usd(e.bonusCents) : "—"}</TableCell>
                    <TableCell className="tabular-nums">{e.adjustmentCents ? usd(e.adjustmentCents) : "—"}</TableCell>
                    <TableCell className="tabular-nums font-medium">{usd(e.baseCents + e.bonusCents + e.adjustmentCents)}</TableCell>
                    <TableCell><StatusBadge status={e.status} /></TableCell>
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
