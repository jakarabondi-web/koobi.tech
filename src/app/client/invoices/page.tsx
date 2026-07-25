import type { Metadata } from "next";
import { Receipt } from "lucide-react";

import { prisma } from "@/lib/db/prisma";
import { requireTenant } from "@/server/services/tenant";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";

export const metadata: Metadata = { title: "Invoices" };
const usd = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function ClientInvoicesPage() {
  const tenant = await requireTenant();
  const invoices = await prisma.invoice.findMany({
    where: { organizationId: tenant.organizationId },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Invoices" description="Billing history for your organization." />
      <Card>
        <CardContent className="pt-6 pb-6">
          {invoices.length === 0 ? (
            <EmptyState icon={Receipt} title="No invoices yet" description="Invoices appear here once billing runs." />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Invoice</TableHead><TableHead>Amount</TableHead><TableHead>Issued</TableHead>
                <TableHead>Due</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {invoices.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{i.id.slice(0, 8)}</TableCell>
                    <TableCell className="tabular-nums font-medium">{usd(i.amountCents)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{i.createdAt.toLocaleDateString()}</TableCell>
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
