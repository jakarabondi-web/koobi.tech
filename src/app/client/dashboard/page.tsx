import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, CheckCircle2, DollarSign, Gauge, Plus, Users, AlertTriangle, Download } from "lucide-react";

import { prisma } from "@/lib/db/prisma";
import { requireTenant } from "@/server/services/tenant";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { StatusBadge } from "@/components/ui/badge-status";

export const metadata: Metadata = { title: "Dashboard" };
const usd = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function ClientDashboardPage() {
  const tenant = await requireTenant();
  const orgId = tenant.organizationId;

  const [projects, taskCounts, invoices, exports, workforce] = await Promise.all([
    prisma.project.findMany({
      where: { organizationId: orgId },
      include: { _count: { select: { tasks: true, assignments: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.task.groupBy({
      by: ["status"],
      where: { project: { organizationId: orgId } },
      _count: true,
    }),
    prisma.invoice.aggregate({
      where: { organizationId: orgId, status: { in: ["SENT", "PAID"] } },
      _sum: { amountCents: true },
    }),
    prisma.export.findMany({
      where: { dataset: { organizationId: orgId } },
      include: { dataset: true },
      orderBy: { createdAt: "desc" },
      take: 5,
    }),
    prisma.projectAssignment.findMany({
      where: { project: { organizationId: orgId }, status: "ACTIVE" },
      select: { userId: true },
      distinct: ["userId"],
    }),
  ]);

  const countFor = (s: string) => taskCounts.find((t) => t.status === s)?._count ?? 0;
  const approved = countFor("APPROVED");
  const rejected = countFor("REJECTED");
  const inReview = countFor("SUBMITTED") + countFor("UNDER_REVIEW");
  const totalTasks = taskCounts.reduce((s, t) => s + t._count, 0);
  const acceptanceRate = approved + rejected > 0 ? approved / (approved + rejected) : null;

  const active = projects.filter((p) => p.status === "ACTIVE");
  const awaitingSetup = projects.filter((p) => p.status === "DRAFT" || p.status === "PENDING_SETUP");

  return (
    <div className="space-y-8">
      <PageHeader
        title={tenant.organizationName}
        description="Delivery, quality, and spend across your projects."
        actions={
          <Button variant="violet" asChild>
            <Link href="/client/projects/new"><Plus className="size-4" /> Create project</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active projects" value={String(active.length)} icon={Briefcase} />
        <KpiCard label="Tasks accepted" value={approved.toLocaleString()} icon={CheckCircle2} />
        <KpiCard label="Spend to date" value={usd(invoices._sum.amountCents ?? 0)} icon={DollarSign} />
        <KpiCard
          label="Acceptance rate"
          value={acceptanceRate === null ? "—" : `${Math.round(acceptanceRate * 100)}%`}
          icon={Gauge}
          trend={acceptanceRate && acceptanceRate >= 0.9 ? "up" : "flat"}
        />
      </div>

      {awaitingSetup.length > 0 ? (
        <div className="flex items-start gap-3 rounded-lg border border-warning/40 bg-warning/10 p-4">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warning-foreground" />
          <div className="flex-1 text-sm">
            <p className="font-medium">
              {awaitingSetup.length} project{awaitingSetup.length === 1 ? "" : "s"} awaiting setup
            </p>
            <p className="text-muted-foreground">
              Finish configuring them so we can start matching experts.
            </p>
          </div>
          <Button size="sm" variant="outline" asChild><Link href="/client/projects">Review</Link></Button>
        </div>
      ) : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Delivery progress</CardTitle></CardHeader>
          <CardContent className="pb-6">
            {active.length === 0 ? (
              <EmptyState
                icon={Briefcase}
                title="No active projects"
                description="Create a project to start collecting human-verified data."
                action={<Button size="sm" asChild><Link href="/client/projects/new">Create project</Link></Button>}
              />
            ) : (
              <ul className="space-y-4">
                {active.map((p) => {
                  const pct = p._count.tasks > 0 ? Math.round((approved / p._count.tasks) * 100) : 0;
                  return (
                    <li key={p.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3 text-sm">
                        <Link href={`/client/projects/${p.id}`} className="truncate font-medium hover:underline">
                          {p.name}
                        </Link>
                        <span className="shrink-0 text-xs text-muted-foreground">
                          {p._count.tasks} tasks · {p._count.assignments} experts
                        </span>
                      </div>
                      <Progress value={Math.min(100, pct)} />
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Pipeline</CardTitle></CardHeader>
          <CardContent className="space-y-3 pb-6 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Total tasks</span><span className="font-medium tabular-nums">{totalTasks}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">In review</span><span className="tabular-nums">{inReview}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Accepted</span><span className="tabular-nums text-success">{approved}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Rejected</span><span className="tabular-nums">{rejected}</span></div>
            <div className="flex justify-between border-t border-border pt-3">
              <span className="text-muted-foreground">Experts engaged</span>
              <span className="flex items-center gap-1.5 font-medium"><Users className="size-3.5" />{workforce.length}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent exports</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {exports.length === 0 ? (
            <EmptyState
              icon={Download}
              title="No exports yet"
              description="Once tasks are accepted you can export production-ready datasets."
            />
          ) : (
            <ul className="divide-y divide-border">
              {exports.map((e) => (
                <li key={e.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                  <div className="min-w-0">
                    <p className="truncate font-medium">{e.dataset.name}</p>
                    <p className="text-xs text-muted-foreground">{e.format.toUpperCase()} · {e.createdAt.toLocaleDateString()}</p>
                  </div>
                  <StatusBadge status={e.status} />
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
