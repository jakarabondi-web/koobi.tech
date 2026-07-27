import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wallet, Clock, Send, CheckCircle2, CreditCard } from "lucide-react";

import { auth } from "@/lib/auth";
import { requireApprovedTrainer } from "@/server/services/trainer-gate";
import { prisma } from "@/lib/db/prisma";
import { getWalletSummary, MIN_PAYOUT_CENTS } from "@/server/services/wallet";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";
import { PayoutRequestForm } from "@/components/trainer/payout-request-form";
import { AddPaymentMethodForm } from "@/components/trainer/add-payment-method-form";

export const metadata: Metadata = { title: "Payments" };

function usd(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function TrainerPaymentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  await requireApprovedTrainer(session.user.id);
  const userId = session.user.id;

  const [wallet, accounts, requests] = await Promise.all([
    getWalletSummary(userId),
    prisma.paymentAccount.findMany({ where: { userId }, orderBy: { createdAt: "asc" } }),
    prisma.payoutRequest.findMany({
      where: { userId },
      include: { paymentAccount: true },
      orderBy: { requestedAt: "desc" },
      take: 20,
    }),
  ]);

  const payoutMethods = accounts
    .filter((a) => a.provider === "MPESA" || a.provider === "STRIPE_CONNECT")
    .map((a) => ({
      id: a.id,
      label:
        a.provider === "MPESA"
          ? `M-Pesa · ${a.mpesaPhoneNumber ?? "unknown number"}`
          : `Stripe · ${a.externalId ?? "unknown account"}`,
    }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Wallet & payments"
        description="Request a payout of your approved earnings any time you reach the minimum."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Available to withdraw" value={usd(wallet.availableCents)} icon={Wallet} trend="up" />
        <KpiCard label="Pending approval" value={usd(wallet.pendingCents)} icon={Clock} />
        <KpiCard label="In transit" value={usd(wallet.inTransitCents)} icon={Send} />
        <KpiCard label="Paid to date" value={usd(wallet.paidCents)} icon={CheckCircle2} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Request a payout</CardTitle>
            <CardDescription>
              Approved earnings are cashable immediately — most trainers withdraw weekly.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <PayoutRequestForm
              methods={payoutMethods}
              availableCents={wallet.availableCents}
              minCents={MIN_PAYOUT_CENTS}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payout methods</CardTitle>
            <CardDescription>Add M-Pesa for mobile money, or Stripe for bank transfer.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-5 pb-6">
            {accounts.length > 0 ? (
              <ul className="divide-y divide-border">
                {accounts.map((a) => (
                  <li key={a.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <CreditCard className="size-4 text-muted-foreground" />
                    <span className="flex-1">
                      {a.provider === "MPESA"
                        ? `M-Pesa · ${a.mpesaPhoneNumber}`
                        : `${a.provider.replace(/_/g, " ")} · ${a.externalId ?? "—"}`}
                    </span>
                  </li>
                ))}
              </ul>
            ) : null}
            <AddPaymentMethodForm />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payout history</CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          {requests.length === 0 ? (
            <EmptyState
              icon={Wallet}
              title="No payouts yet"
              description="Once you request a payout it'll appear here with its current status."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requested</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>{r.requestedAt.toLocaleDateString()}</TableCell>
                    <TableCell>
                      {r.provider === "MPESA"
                        ? `M-Pesa · ${r.paymentAccount.mpesaPhoneNumber}`
                        : "Stripe transfer"}
                    </TableCell>
                    <TableCell className="tabular-nums">{usd(r.amountCents)}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {r.providerReference ?? r.failureReason ?? "—"}
                    </TableCell>
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
