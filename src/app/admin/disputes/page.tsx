import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Scale, Flag } from "lucide-react";

import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions/can";
import { prisma } from "@/lib/db/prisma";
import { listOpenAppeals } from "@/server/services/appeals";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";
import { Badge } from "@/components/ui/badge";
import { AppealDecisionForm } from "@/components/admin/appeal-decision-form";
import { DisputeDecisionForm } from "@/components/admin/dispute-decision-form";

export const metadata: Metadata = { title: "Disputes" };
const usd = (c: number | null) => (c === null ? "—" : (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" }));

export default async function DisputesPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const canDecide = can(session.user.roles, "dispute.resolve");

  const [disputes, appeals] = await Promise.all([
    prisma.dispute.findMany({ include: { user: true }, orderBy: { createdAt: "desc" } }),
    listOpenAppeals(),
  ]);
  const open = disputes.filter((d) => d.status === "OPEN" || d.status === "UNDER_REVIEW");

  return (
    <div className="space-y-6">
      <PageHeader title="Disputes & appeals" description="Payment disputes and quality appeals raised by trainers." />
      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Open disputes" value={String(open.length)} icon={Scale} />
        <KpiCard label="Open quality appeals" value={String(appeals.length)} icon={Flag} />
        <KpiCard label="Total disputes" value={String(disputes.length)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Quality appeals</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {appeals.length === 0 ? (
            <EmptyState icon={Flag} title="No open appeals"
              description="Trainers appealing a review decision will show up here." />
          ) : (
            <ul className="space-y-4">
              {appeals.map((a) => (
                <li key={a.id} className="space-y-2 rounded-lg border border-border p-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-medium">
                        {a.user.firstName} {a.user.lastName}
                        {a.submission ? (
                          <span className="text-muted-foreground">
                            {" "}
                            · {a.submission.task.project.name}
                            {a.submission.task.template ? ` — ${a.submission.task.template.name}` : ""}
                          </span>
                        ) : null}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Appealing: <Badge variant={a.review?.decision === "REJECTED" ? "destructive" : "warning"}>
                          {a.review?.decision.replace(/_/g, " ").toLowerCase() ?? "—"}
                        </Badge>
                      </p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>
                  <p className="text-sm">{a.reason}</p>
                  {a.review?.feedback ? (
                    <p className="text-xs text-muted-foreground">Original feedback: {a.review.feedback}</p>
                  ) : null}
                  {canDecide ? <AppealDecisionForm appealId={a.id} /> : null}
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Payment disputes</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {disputes.length === 0 ? (
            <EmptyState icon={Scale} title="No disputes"
              description="Payment disputes raised by trainers will appear here for review." />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Trainer</TableHead><TableHead>Reason</TableHead><TableHead>Amount</TableHead>
                <TableHead>Raised</TableHead><TableHead>Status</TableHead>
                {canDecide ? <TableHead></TableHead> : null}
              </TableRow></TableHeader>
              <TableBody>
                {disputes.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{d.user.firstName} {d.user.lastName}</TableCell>
                    <TableCell className="max-w-sm truncate text-sm">{d.reason}</TableCell>
                    <TableCell className="tabular-nums">{usd(d.amountCents)}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell><StatusBadge status={d.status} /></TableCell>
                    {canDecide ? (
                      <TableCell className="text-right">
                        {d.status === "OPEN" || d.status === "UNDER_REVIEW" ? (
                          <DisputeDecisionForm disputeId={d.id} />
                        ) : null}
                      </TableCell>
                    ) : null}
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
