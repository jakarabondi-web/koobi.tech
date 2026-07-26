import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { TrendingUp, Wallet, Receipt, PiggyBank } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";
import { MonthlyTrendChart, type MonthlyTrendPoint } from "@/components/charts/monthly-trend-chart";
import { StatusDonutChart, type DonutSlice } from "@/components/charts/status-donut-chart";

export const metadata: Metadata = { title: "Analytics" };

const MONTHS_BACK = 6;

function usd(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function monthBuckets(count: number) {
  const now = new Date();
  const buckets: { key: string; label: string; start: Date; end: Date }[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
    buckets.push({
      key: `${start.getFullYear()}-${start.getMonth()}`,
      label: start.toLocaleString("en-US", { month: "short" }),
      start,
      end,
    });
  }
  return buckets;
}

function bucketOf(date: Date, buckets: ReturnType<typeof monthBuckets>) {
  return buckets.find((b) => date >= b.start && date < b.end);
}

export default async function AnalyticsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const buckets = monthBuckets(MONTHS_BACK);
  const earliestStart = buckets[0].start;

  const [paidInvoices, paidPayouts, newTrainers, newOrgs, invoicesByStatus, topClients] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: "PAID", paidAt: { gte: earliestStart } },
      select: { amountCents: true, paidAt: true },
    }),
    prisma.payoutRequest.findMany({
      where: { status: "PAID", processedAt: { gte: earliestStart } },
      select: { amountCents: true, processedAt: true },
    }),
    prisma.user.findMany({
      where: { createdAt: { gte: earliestStart }, roles: { some: { role: { key: "TRAINER" } } } },
      select: { createdAt: true },
    }),
    prisma.organization.findMany({
      where: { createdAt: { gte: earliestStart } },
      select: { createdAt: true },
    }),
    prisma.invoice.groupBy({ by: ["status"], _count: true, _sum: { amountCents: true } }),
    prisma.invoice.groupBy({
      by: ["organizationId"],
      where: { status: "PAID" },
      _sum: { amountCents: true },
      orderBy: { _sum: { amountCents: "desc" } },
      take: 5,
    }),
  ]);

  const revenueTotalCents = invoicesByStatus.find((i) => i.status === "PAID")?._sum.amountCents ?? 0;
  const outstandingCents =
    (invoicesByStatus.find((i) => i.status === "SENT")?._sum.amountCents ?? 0) +
    (invoicesByStatus.find((i) => i.status === "OVERDUE")?._sum.amountCents ?? 0);
  const payoutsPaidCents = paidPayouts.reduce((sum, p) => sum + p.amountCents, 0);
  const netCents = revenueTotalCents - payoutsPaidCents;

  const financeTrend: MonthlyTrendPoint[] = buckets.map((b) => ({ month: b.label, revenue: 0, payouts: 0 }));
  for (const inv of paidInvoices) {
    const bucket = inv.paidAt ? bucketOf(inv.paidAt, buckets) : undefined;
    if (!bucket) continue;
    const point = financeTrend[buckets.indexOf(bucket)];
    point.revenue = (point.revenue as number) + inv.amountCents;
  }
  for (const payout of paidPayouts) {
    const bucket = payout.processedAt ? bucketOf(payout.processedAt, buckets) : undefined;
    if (!bucket) continue;
    const point = financeTrend[buckets.indexOf(bucket)];
    point.payouts = (point.payouts as number) + payout.amountCents;
  }

  const growthTrend: MonthlyTrendPoint[] = buckets.map((b) => ({ month: b.label, trainers: 0, clients: 0 }));
  for (const t of newTrainers) {
    const bucket = bucketOf(t.createdAt, buckets);
    if (!bucket) continue;
    const point = growthTrend[buckets.indexOf(bucket)];
    point.trainers = (point.trainers as number) + 1;
  }
  for (const o of newOrgs) {
    const bucket = bucketOf(o.createdAt, buckets);
    if (!bucket) continue;
    const point = growthTrend[buckets.indexOf(bucket)];
    point.clients = (point.clients as number) + 1;
  }

  const statusColors: Record<string, string> = {
    DRAFT: "var(--muted-foreground)",
    SENT: "var(--chart-2)",
    PAID: "var(--chart-4)",
    OVERDUE: "var(--destructive)",
    VOID: "var(--border)",
  };
  const invoiceDonut: DonutSlice[] = invoicesByStatus
    .filter((i) => i._count > 0)
    .map((i) => ({
      key: i.status,
      name: i.status.charAt(0) + i.status.slice(1).toLowerCase(),
      value: i._count,
      color: statusColors[i.status] ?? "var(--chart-1)",
    }));

  const clientOrgs = await prisma.organization.findMany({
    where: { id: { in: topClients.map((c) => c.organizationId) } },
    select: { id: true, name: true },
  });
  const clientName = (id: string) => clientOrgs.find((o) => o.id === id)?.name ?? "—";

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics"
        description="Revenue, payouts, and growth across the platform. Fills in as more data flows through."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Revenue (all time)" value={usd(revenueTotalCents)} icon={TrendingUp} />
        <KpiCard label="Outstanding invoices" value={usd(outstandingCents)} icon={Receipt} />
        <KpiCard label="Payouts paid" value={usd(payoutsPaidCents)} icon={Wallet} />
        <KpiCard
          label="Net"
          value={usd(netCents)}
          icon={PiggyBank}
          trend={netCents >= 0 ? "up" : "down"}
          trendLabel={netCents >= 0 ? "Revenue over payouts" : "Payouts over revenue"}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Revenue vs. payouts</CardTitle>
            <CardDescription>Last {MONTHS_BACK} months, based on paid invoices and completed payouts.</CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <MonthlyTrendChart
              data={financeTrend}
              valueFormat="currency"
              series={[
                { key: "revenue", name: "Revenue", color: "var(--chart-1)" },
                { key: "payouts", name: "Payouts", color: "var(--chart-5)" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invoice status</CardTitle>
            <CardDescription>All invoices, current state.</CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <StatusDonutChart data={invoiceDonut} />
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Growth</CardTitle>
            <CardDescription>New trainers and client organizations, last {MONTHS_BACK} months.</CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <MonthlyTrendChart
              data={growthTrend}
              valueFormat="number"
              series={[
                { key: "trainers", name: "New trainers", color: "var(--chart-1)" },
                { key: "clients", name: "New clients", color: "var(--chart-4)" },
              ]}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Top clients by revenue</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            {topClients.length === 0 ? (
              <p className="text-sm text-muted-foreground">No paid invoices yet.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Client</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topClients.map((c) => (
                    <TableRow key={c.organizationId}>
                      <TableCell>{clientName(c.organizationId)}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {usd(c._sum.amountCents ?? 0)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Invoice breakdown</CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Count</TableHead>
                <TableHead className="text-right">Total</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {invoicesByStatus.map((i) => (
                <TableRow key={i.status}>
                  <TableCell><StatusBadge status={i.status} /></TableCell>
                  <TableCell className="text-right tabular-nums">{i._count}</TableCell>
                  <TableCell className="text-right tabular-nums">{usd(i._sum.amountCents ?? 0)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
