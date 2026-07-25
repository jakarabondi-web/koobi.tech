import type { Metadata } from "next";
import Link from "next/link";
import { CreditCard, AlertTriangle, DollarSign, Receipt, TrendingUp } from "lucide-react";

import { prisma } from "@/lib/db/prisma";
import { requireTenant } from "@/server/services/tenant";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Billing" };
const usd = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function BillingPage() {
  const tenant = await requireTenant();
  const stripeLive = Boolean(process.env.STRIPE_SECRET_KEY);

  const [account, totals, thisMonth, projects] = await Promise.all([
    prisma.billingAccount.findUnique({ where: { organizationId: tenant.organizationId } }),
    prisma.invoice.aggregate({
      where: { organizationId: tenant.organizationId, status: "PAID" },
      _sum: { amountCents: true },
    }),
    prisma.invoice.aggregate({
      where: {
        organizationId: tenant.organizationId,
        createdAt: { gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1) },
      },
      _sum: { amountCents: true },
    }),
    prisma.project.aggregate({
      where: { organizationId: tenant.organizationId, status: "ACTIVE" },
      _sum: { budgetCents: true },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader title="Billing" description="Spend, payment method, and invoices." />

      {!stripeLive ? (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
          <div>
            <p className="font-medium">Billing is not connected</p>
            <p className="text-muted-foreground">
              No Stripe key is configured, so no payment method can be stored and no charges are made.
              Figures below come from invoice records only.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Paid to date" value={usd(totals._sum.amountCents ?? 0)} icon={DollarSign} />
        <KpiCard label="This month" value={usd(thisMonth._sum.amountCents ?? 0)} icon={TrendingUp} />
        <KpiCard label="Committed budget" value={usd(projects._sum.budgetCents ?? 0)} icon={Receipt} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payment method</CardTitle>
          <CardDescription>How this organization is charged.</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <div className="flex items-center justify-between gap-4 rounded-lg border border-border p-4">
            <div className="flex items-center gap-3">
              <CreditCard className="size-5 text-muted-foreground" />
              <div>
                <p className="text-sm font-medium">
                  {account?.stripeCustomerId ? "Card on file" : "No payment method"}
                </p>
                <p className="text-xs text-muted-foreground">
                  {account?.billingEmail ?? "Billing email not set"}
                </p>
              </div>
            </div>
            <Badge variant={stripeLive ? "outline" : "warning"}>{stripeLive ? "Stripe connected" : "Not connected"}</Badge>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Invoices</CardTitle></CardHeader>
        <CardContent className="pb-6">
          <Button variant="outline" asChild><Link href="/client/invoices">View all invoices</Link></Button>
        </CardContent>
      </Card>
    </div>
  );
}
