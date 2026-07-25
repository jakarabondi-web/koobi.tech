import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Receipt } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";

export const metadata: Metadata = { title: "Invoices" };
const usd = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function InvoicesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [invoices, totals] = await Promise.all([
    prisma.invoice.findMany({ include: { organization: true }, orderBy: { createdAt: "desc" } }),
    prisma.invoice.groupBy({ by: ["status"], _sum: { amountCents: true } }),
  ]);
  const sumFor = (s: string) => totals.find((t) => t.status === s)?._sum.amountCents ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Client invoices" description="Billing issued to client organizations." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Paid" value={usd(sumFor("PAID"))} icon={Receipt} />
        <KpiCard label="Sent" value={usd(sumFor("SENT"))} />
        <KpiCard label="Overdue" value={usd(sumFor("OVERDUE"))} trend={sumFor("OVERDUE") > 0 ? "down" : "flat"} />
        <KpiCard label="Draft" value={usd(sumFor("DRAFT"))} />
      </div>
      <Card>
        <CardContent className="pt-6 pb-6">
          {invoices.length === 0 ? (
            <EmptyState icon={Receipt} title="No invoices yet" description="Client invoices will appear here once billing runs." />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Invoice</TableHead><TableHead>Client</TableHead><TableHead>Amount</TableHead>
                <TableHead>Due</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {invoices.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{i.id.slice(0, 8)}</TableCell>
                    <TableCell>{i.organization.name}</TableCell>
                    <TableCell className="tabular-nums font-medium">{usd(i.amountCents)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{i.dueDate?.toLocaleDateString() ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={i.status} /></TableCell>
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
