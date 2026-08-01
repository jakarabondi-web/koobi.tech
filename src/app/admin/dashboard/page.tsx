import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users, Briefcase, ListChecks, Wallet, ShieldAlert, LifeBuoy, UserPlus, ClipboardCheck } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Admin dashboard" };

function usd(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [
    activeTrainers,
    pendingApplications,
    activeProjects,
    tasksInProgress,
    tasksAwaitingReview,
    payoutQueue,
    openRiskFlags,
    supportBacklog,
    pendingProjectApplications,
    recentAudit,
  ] = await Promise.all([
    prisma.user.count({ where: { status: "ACTIVE", roles: { some: { role: { key: "TRAINER" } } } } }),
    prisma.application.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.project.count({ where: { status: "ACTIVE" } }),
    prisma.task.count({ where: { status: { in: ["ASSIGNED", "IN_PROGRESS"] } } }),
    prisma.task.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.payoutRequest.aggregate({
      where: { status: { in: ["REQUESTED", "APPROVED"] } },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.riskFlag.count({ where: { status: "OPEN" } }),
    prisma.supportTicket.count({ where: { status: { in: ["OPEN", "ASSIGNED", "ESCALATED"] } } }),
    prisma.projectApplication.count({ where: { status: "APPLIED" } }),
    prisma.auditLog.findMany({ include: { actor: true }, orderBy: { createdAt: "desc" }, take: 8 }),
  ]);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Operations overview"
        description={`Signed in as ${session.user.name}. Here's what needs attention across the platform.`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active trainers" value={activeTrainers.toLocaleString()} icon={Users} />
        <KpiCard label="Active projects" value={activeProjects.toLocaleString()} icon={Briefcase} />
        <KpiCard label="Tasks in progress" value={tasksInProgress.toLocaleString()} icon={ListChecks} />
        <KpiCard
          label="Payouts queued"
          value={usd(payoutQueue._sum.amountCents ?? 0)}
          icon={Wallet}
          trendLabel={`${payoutQueue._count} request${payoutQueue._count === 1 ? "" : "s"}`}
          trend="flat"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Applications pending" value={String(pendingApplications)} icon={UserPlus} />
        <KpiCard label="Awaiting review" value={String(tasksAwaitingReview)} icon={ClipboardCheck} />
        <KpiCard label="Open fraud flags" value={String(openRiskFlags)} icon={ShieldAlert} trend={openRiskFlags > 0 ? "down" : "flat"} />
        <KpiCard label="Support backlog" value={String(supportBacklog)} icon={LifeBuoy} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            {recentAudit.length === 0 ? (
              <EmptyState
                title="No recorded activity yet"
                description="Sensitive admin actions are audit-logged and appear here."
              />
            ) : (
              <ul className="divide-y divide-border">
                {recentAudit.map((log) => (
                  <li key={log.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{log.action.replace(/[._]/g, " ")}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.actor ? `${log.actor.firstName} ${log.actor.lastName}` : "System"} ·{" "}
                        {log.entityType}
                      </p>
                    </div>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {log.createdAt.toLocaleDateString()}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Needs your attention</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 pb-5">
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link href="/admin/payments">
                Payout queue <Badge variant={payoutQueue._count > 0 ? "default" : "outline"}>{payoutQueue._count}</Badge>
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link href="/admin/applications">
                Trainer applications <Badge variant={pendingApplications > 0 ? "default" : "outline"}>{pendingApplications}</Badge>
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link href="/admin/projects">
                Project applications <Badge variant={pendingProjectApplications > 0 ? "default" : "outline"}>{pendingProjectApplications}</Badge>
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link href="/admin/fraud">
                Fraud alerts <Badge variant={openRiskFlags > 0 ? "destructive" : "outline"}>{openRiskFlags}</Badge>
              </Link>
            </Button>
            <Button variant="outline" className="w-full justify-between" asChild>
              <Link href="/admin/users">Manage users & roles</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
