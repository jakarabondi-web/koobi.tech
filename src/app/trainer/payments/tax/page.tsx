import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Landmark } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const metadata: Metadata = { title: "Tax documents" };

const usd = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function TaxPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const paid = await prisma.earning.findMany({
    where: { userId: session.user.id, status: "PAID" },
    select: { baseCents: true, bonusCents: true, adjustmentCents: true, createdAt: true },
  });

  const byYear = new Map<number, number>();
  for (const e of paid) {
    const y = e.createdAt.getFullYear();
    byYear.set(y, (byYear.get(y) ?? 0) + e.baseCents + e.bonusCents + e.adjustmentCents);
  }
  const years = [...byYear.entries()].sort((a, b) => b[0] - a[0]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Tax documents" description="Your annual earnings summary." />

      <Card>
        <CardHeader><CardTitle className="text-base">Earnings by year</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {years.length === 0 ? (
            <EmptyState icon={Landmark} title="No paid earnings yet" description="Yearly totals appear here once you've been paid." />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Year</TableHead><TableHead>Total paid</TableHead></TableRow></TableHeader>
              <TableBody>
                {years.map(([year, cents]) => (
                  <TableRow key={year}>
                    <TableCell className="font-medium">{year}</TableCell>
                    <TableCell className="tabular-nums">{usd(cents)}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Tax forms</p>
        <p className="mt-1">
          Downloadable tax forms (1099-NEC, W-8BEN and equivalents) aren&apos;t generated yet. Until
          then, use the totals above, and consult a tax professional for your jurisdiction —
          Trainora AI doesn&apos;t provide tax advice.
        </p>
      </div>
    </div>
  );
}
