import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, Briefcase, Users, Upload } from "lucide-react";

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

export const metadata: Metadata = { title: "Project detail" };

export default async function AdminProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;
  const canMatch = can(session.user.roles, "assignment.match");

  const project = await prisma.project.findUnique({
    where: { id },
    include: { organization: true, _count: { select: { tasks: true, assignments: true } } },
  });
  if (!project) notFound();

  const [pendingApplications, activeAssignments] = await Promise.all([
    prisma.projectApplication.findMany({
      where: { projectId: id, status: "APPLIED" },
      include: { user: { select: { firstName: true, lastName: true, email: true } } },
      orderBy: { appliedAt: "asc" },
    }),
    prisma.projectAssignment.findMany({
      where: { projectId: id, status: "ACTIVE" },
      orderBy: { assignedAt: "desc" },
    }),
  ]);

  const assignedUsers = activeAssignments.length
    ? await prisma.user.findMany({
        where: { id: { in: activeAssignments.map((a) => a.userId) } },
        select: { id: true, firstName: true, lastName: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/projects"><ArrowLeft className="size-4" /> All projects</Link>
      </Button>

      <PageHeader
        title={project.name}
        description={project.organization.name}
        actions={
          <Button size="sm" variant="outline" asChild>
            <Link href={`/admin/projects/${id}/import`}><Upload className="size-4" /> Import tasks</Link>
          </Button>
        }
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Tasks" value={String(project._count.tasks)} icon={Briefcase} />
        <KpiCard label="Active assignments" value={String(project._count.assignments)} icon={Users} />
        <KpiCard label="Pending applications" value={String(pendingApplications.length)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Pending applications</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {pendingApplications.length === 0 ? (
            <EmptyState title="Nothing waiting" description="Trainer applications to this project will show up here." />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Trainer</TableHead><TableHead>Applied</TableHead><TableHead>Status</TableHead>
                {canMatch ? <TableHead></TableHead> : null}
              </TableRow></TableHeader>
              <TableBody>
                {pendingApplications.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.user.firstName} {a.user.lastName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.appliedAt.toLocaleDateString()}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    {canMatch ? (
                      <TableCell className="text-right">
                        <ApplicationDecisionForm applicationId={a.id} projectId={id} />
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
        <CardHeader><CardTitle className="text-base">Active roster</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {activeAssignments.length === 0 ? (
            <EmptyState icon={Users} title="No one assigned yet" />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Trainer</TableHead><TableHead>Assigned</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {activeAssignments.map((a) => {
                  const u = assignedUsers.find((x) => x.id === a.userId);
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-medium">{u ? `${u.firstName} ${u.lastName}` : "—"}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{a.assignedAt.toLocaleDateString()}</TableCell>
                      <TableCell><StatusBadge status={a.status} /></TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
