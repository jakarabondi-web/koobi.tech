import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Briefcase, Upload, UserPlus } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { can } from "@/lib/permissions/can";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";
import { Button } from "@/components/ui/button";
import { ApplicationDecisionForm } from "@/components/admin/application-decision-form";
import Link from "next/link";

export const metadata: Metadata = { title: "Projects" };
const usd = (c: number | null) => (c === null ? "—" : `$${(c / 100).toFixed(2)}`);

export default async function AdminProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const canMatch = can(session.user.roles, "assignment.match");

  const [projects, counts, pendingApplications] = await Promise.all([
    prisma.project.findMany({
      include: { organization: true, _count: { select: { tasks: true, assignments: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.project.groupBy({ by: ["status"], _count: true }),
    prisma.projectApplication.findMany({
      where: { status: "APPLIED" },
      include: {
        user: { select: { firstName: true, lastName: true, email: true } },
        project: { select: { name: true } },
      },
      orderBy: { appliedAt: "asc" },
    }),
  ]);
  const countFor = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Projects" description="Every project across all client organizations." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active" value={String(countFor("ACTIVE"))} icon={Briefcase} />
        <KpiCard label="Draft" value={String(countFor("DRAFT"))} />
        <KpiCard label="Paused" value={String(countFor("PAUSED"))} />
        <KpiCard label="Completed" value={String(countFor("COMPLETED"))} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Pending applications</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {pendingApplications.length === 0 ? (
            <EmptyState icon={UserPlus} title="Nothing waiting"
              description="Trainer applications to any project show up here, across every project at once." />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Trainer</TableHead><TableHead>Project</TableHead><TableHead>Applied</TableHead>
                {canMatch ? <TableHead></TableHead> : null}
              </TableRow></TableHeader>
              <TableBody>
                {pendingApplications.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.user.firstName} {a.user.lastName}</TableCell>
                    <TableCell className="text-sm">{a.project.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.appliedAt.toLocaleDateString()}</TableCell>
                    {canMatch ? (
                      <TableCell className="text-right">
                        <ApplicationDecisionForm applicationId={a.id} projectId={a.projectId} />
                      </TableCell>
                    ) : null}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 pb-6">
          {projects.length === 0 ? <EmptyState icon={Briefcase} title="No projects yet" /> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Project</TableHead><TableHead>Client</TableHead><TableHead>Type</TableHead>
                <TableHead>Pay/task</TableHead><TableHead>Tasks</TableHead><TableHead>Trainers</TableHead>
                <TableHead>Status</TableHead><TableHead className="text-right">Tasks</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell className="text-sm">{p.organization.name}</TableCell>
                    <TableCell className="text-xs">{p.taskType.replace(/_/g, " ").toLowerCase()}</TableCell>
                    <TableCell className="tabular-nums">{usd(p.payPerTaskCents)}</TableCell>
                    <TableCell className="tabular-nums">{p._count.tasks}</TableCell>
                    <TableCell className="tabular-nums">{p._count.assignments}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/projects/${p.id}`}>View</Link>
                        </Button>
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/admin/projects/${p.id}/import`}>
                            <Upload className="size-4" /> Import
                          </Link>
                        </Button>
                      </div>
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
