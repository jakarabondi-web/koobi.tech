import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Scale } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";

export const metadata: Metadata = { title: "Disputes" };
const usd = (c: number | null) => (c === null ? "—" : (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" }));

export default async function DisputesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [disputes, appeals] = await Promise.all([
    prisma.dispute.findMany({ include: { user: true }, orderBy: { createdAt: "desc" } }),
    prisma.qualityAppeal.findMany({ where: { status: { in: ["OPEN", "UNDER_REVIEW"] } } }),
  ]);
  const open = disputes.filter((d) => d.status === "OPEN" || d.status === "UNDER_REVIEW");

  return (
    <div className="space-y-6">
      <PageHeader title="Disputes & appeals" description="Payment disputes and quality appeals raised by trainers." />
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Open disputes" value={String(open.length)} icon={Scale} />
        <KpiCard label="Open quality appeals" value={String(appeals.length)} />
        <KpiCard label="Total disputes" value={String(disputes.length)} />
      </div>
      <Card>
        <CardContent className="pt-6 pb-6">
          {disputes.length === 0 ? (
            <EmptyState icon={Scale} title="No disputes"
              description="Payment disputes raised by trainers will appear here for review." />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Trainer</TableHead><TableHead>Reason</TableHead><TableHead>Amount</TableHead>
                <TableHead>Raised</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {disputes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.user.firstName} {d.user.lastName}</TableCell>
                    <TableCell className="max-w-sm truncate text-sm">{d.reason}</TableCell>
                    <TableCell className="tabular-nums">{usd(d.amountCents)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
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
