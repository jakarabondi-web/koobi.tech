import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, CheckCircle2, Clock, Users, Gauge, Upload } from "lucide-react";

import { prisma } from "@/lib/db/prisma";
import { requireTenant, requireProjectInTenant, TenantError } from "@/server/services/tenant";
import { krippendorffAlpha, bandFor, type Rating } from "@/lib/analytics/agreement";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/badge-status";
import { Progress } from "@/components/ui/progress";
import { ProjectStatusActions } from "@/components/client/project-status-actions";

export const metadata: Metadata = { title: "Project" };
const usd = (c: number | null) => (c === null ? "—" : `$${(c / 100).toFixed(2)}`);

export default async function ClientProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const tenant = await requireTenant();

  try {
    await requireProjectInTenant(id, tenant);
  } catch (err) {
    // A project from another tenant is indistinguishable from one that
    // doesn't exist — both 404.
    if (err instanceof TenantError) notFound();
    throw err;
  }

  const project = await prisma.project.findUniqueOrThrow({
    where: { id },
    include: {
      taskTemplates: true,
      qualifications: true,
      _count: { select: { tasks: true, assignments: true, applications: true } },
    },
  });

  const [taskCounts, submissions, recentTasks] = await Promise.all([
    prisma.task.groupBy({ by: ["status"], where: { projectId: id }, _count: true }),
    prisma.taskSubmission.findMany({
      where: { task: { projectId: id } },
      select: { taskId: true, submittedById: true, content: true },
      take: 500,
    }),
    prisma.task.findMany({
      where: { projectId: id },
      include: { _count: { select: { submissions: true } } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
  ]);

  const countFor = (s: string) => taskCounts.find((t) => t.status === s)?._count ?? 0;
  const approved = countFor("APPROVED");
  const rejected = countFor("REJECTED");
  const inReview = countFor("SUBMITTED") + countFor("UNDER_REVIEW");
  const completion = project._count.tasks > 0 ? Math.round((approved / project._count.tasks) * 100) : 0;

  const ratings: Rating[] = submissions
    .map((s) => {
      const c = s.content as { preferred?: string } | null;
      return c?.preferred ? { itemId: s.taskId, raterId: s.submittedById, value: c.preferred } : null;
    })
    .filter((r): r is Rating => r !== null);
  const alpha = krippendorffAlpha(ratings);
  const band = bandFor(alpha);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/client/projects"><ArrowLeft className="size-4" /> All projects</Link>
      </Button>

      <PageHeader
        title={project.name}
        description={project.description ?? undefined}
        actions={
          <div className="flex items-center gap-2">
            <StatusBadge status={project.status} />
            <Button size="sm" variant="outline" asChild>
              <Link href={`/client/projects/${project.id}/import`}>
                <Upload className="size-4" /> Import tasks
              </Link>
            </Button>
            <ProjectStatusActions projectId={project.id} status={project.status} />
          </div>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Tasks accepted" value={String(approved)} icon={CheckCircle2} />
        <KpiCard label="In review" value={String(inReview)} icon={Clock} />
        <KpiCard label="Experts assigned" value={String(project._count.assignments)} icon={Users} />
        <KpiCard
          label="Agreement (α)"
          value={alpha === null ? "—" : alpha.toFixed(2)}
          icon={Gauge}
          trendLabel={band ?? undefined}
          trend={band === "reliable" ? "up" : band === "unreliable" ? "down" : "flat"}
        />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Delivery</CardTitle></CardHeader>
        <CardContent className="space-y-3 pb-6">
          <div className="flex justify-between text-sm">
            <span className="text-muted-foreground">{approved} of {project._count.tasks} tasks accepted</span>
            <span className="font-medium">{completion}%</span>
          </div>
          <Progress value={completion} />
          <div className="grid grid-cols-2 gap-3 pt-2 text-sm sm:grid-cols-4">
            <div><p className="text-xs text-muted-foreground">Unassigned</p><p className="font-medium tabular-nums">{countFor("UNASSIGNED")}</p></div>
            <div><p className="text-xs text-muted-foreground">In progress</p><p className="font-medium tabular-nums">{countFor("ASSIGNED") + countFor("IN_PROGRESS")}</p></div>
            <div><p className="text-xs text-muted-foreground">Rejected</p><p className="font-medium tabular-nums">{rejected}</p></div>
            <div><p className="text-xs text-muted-foreground">Escalated</p><p className="font-medium tabular-nums">{countFor("ESCALATED")}</p></div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Recent tasks</CardTitle></CardHeader>
          <CardContent className="pb-6">
            {recentTasks.length === 0 ? (
              <EmptyState
                icon={Upload}
                title="No tasks yet"
                description="Import a JSONL or CSV file to add work to this project."
                action={
                  <Button size="sm" asChild>
                    <Link href={`/client/projects/${project.id}/import`}>Import tasks</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {recentTasks.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-mono text-xs">{t.id.slice(0, 8)}</p>
                      <p className="text-xs text-muted-foreground">
                        {t._count.submissions} submission{t._count.submissions === 1 ? "" : "s"}
                        {t.isGold ? " · gold" : ""}
                      </p>
                    </div>
                    <StatusBadge status={t.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Configuration</CardTitle></CardHeader>
          <CardContent className="space-y-2.5 pb-6 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Task type</span><span className="text-right text-xs">{project.taskType.replace(/_/g," ").toLowerCase()}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Domain</span><span>{project.domain}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Pay / task</span><span className="tabular-nums">{usd(project.payPerTaskCents)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Budget</span><span className="tabular-nums">{usd(project.budgetCents)}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Quality bar</span><span>{Math.round(project.qualityThreshold * 100)}%</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Languages</span><span>{project.languages.map((l)=>l.toUpperCase()).join(", ") || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Security</span><span>{project.securityLevel}</span></div>
            {project.containsSensitiveContent ? (
              <Badge variant="warning" className="mt-1">Sensitive content</Badge>
            ) : null}
          </CardContent>
        </Card>
      </div>

      {project.taskTemplates[0]?.instructions ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Expert instructions</CardTitle></CardHeader>
          <CardContent className="pb-6">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">
              {project.taskTemplates[0].instructions}
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
