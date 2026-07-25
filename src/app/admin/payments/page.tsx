import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Wallet, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { can } from "@/lib/permissions/can";
import { listPayoutProviders } from "@/lib/payments";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";
import { PayoutActions } from "@/components/admin/payout-actions";

export const metadata: Metadata = { title: "Payouts" };

function usd(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function AdminPayoutsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const canIssue = can(session.user.roles, "payment.issue");

  const [queue, recent, totals] = await Promise.all([
    prisma.payoutRequest.findMany({
      where: { status: { in: ["REQUESTED", "APPROVED"] } },
      include: { user: true, paymentAccount: true },
      orderBy: { requestedAt: "asc" },
    }),
    prisma.payoutRequest.findMany({
      where: { status: { in: ["PAID", "REJECTED", "FAILED"] } },
      include: { user: true },
      orderBy: { processedAt: "desc" },
      take: 15,
    }),
    prisma.payoutRequest.groupBy({ by: ["status"], _sum: { amountCents: true }, _count: true }),
  ]);

  const sumFor = (status: string) => totals.find((t) => t.status === status)?._sum.amountCents ?? 0;
  const queuedCents = queue.reduce((s, r) => s + r.amountCents, 0);

  const mockedProviders = listPayoutProviders().filter((p) => p.isMocked());

  return (
    <div className="space-y-8">
      <PageHeader
        title="Trainer payouts"
        description="Review and release payout requests. Every action is written to the audit log."
      />

      {mockedProviders.length > 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
          <div className="text-sm">
            <p className="font-medium">
              Mocked provider{mockedProviders.length > 1 ? "s" : ""}:{" "}
              {mockedProviders.map((p) => p.label).join(", ")}
            </p>
            <p className="text-muted-foreground">
              No provider credentials are configured, so approving a payout simulates the transfer and
              records a <code className="font-mono text-xs">mock_</code> reference. No real money moves.
            </p>
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Awaiting review" value={usd(queuedCents)} icon={Clock} />
        <KpiCard label="Requests in queue" value={String(queue.length)} icon={Wallet} />
        <KpiCard label="Paid to date" value={usd(sumFor("PAID"))} icon={CheckCircle2} />
        <KpiCard label="Failed / declined" value={usd(sumFor("FAILED") + sumFor("REJECTED"))} icon={AlertTriangle} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Payout queue</CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          {queue.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="No payouts waiting"
              description="New trainer payout requests will appear here for review."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {queue.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <p className="font-medium">
                        {r.user.firstName} {r.user.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{r.user.email}</p>
                    </TableCell>
                    <TableCell>{r.requestedAt.toLocaleDateString()}</TableCell>
                    <TableCell>
                      {r.provider === "MPESA"
                        ? `M-Pesa · ${r.paymentAccount.mpesaPhoneNumber}`
                        : "Stripe transfer"}
                    </TableCell>
                    <TableCell className="tabular-nums font-medium">{usd(r.amountCents)}</TableCell>
                    <TableCell>
                      <StatusBadge status={r.status} />
                    </TableCell>
                    <TableCell className="text-right">
                      {canIssue ? (
                        <PayoutActions
                          payoutRequestId={r.id}
                          amountLabel={usd(r.amountCents)}
                          trainerName={`${r.user.firstName} ${r.user.lastName}`}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">View only</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recently processed</CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          {recent.length === 0 ? (
            <EmptyState title="Nothing processed yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Processed</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reference</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      {r.user.firstName} {r.user.lastName}
                    </TableCell>
                    <TableCell>{r.processedAt?.toLocaleDateString() ?? "—"}</TableCell>
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
