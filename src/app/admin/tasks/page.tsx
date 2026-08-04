import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ListChecks, Clock, CheckCircle2, AlertTriangle } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { TaskAssignmentsTable, type AdminTaskAssignmentRow } from "@/components/admin/task-assignments-table";

export const metadata: Metadata = { title: "Tasks" };

export default async function AdminTasksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const assignments = await prisma.taskAssignment.findMany({
    include: {
      task: { select: { id: true, isGold: true, project: { select: { name: true } } } },
      user: { select: { firstName: true, lastName: true } },
    },
    orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }],
    take: 300,
  });

  const now = new Date();
  const rows: AdminTaskAssignmentRow[] = assignments.map((a) => ({
    id: a.id,
    taskId: a.taskId,
    projectName: a.task.project.name,
    trainerName: `${a.user.firstName} ${a.user.lastName}`,
    assignedAt: a.assignedAt.toISOString(),
    dueAt: a.dueAt ? a.dueAt.toISOString() : null,
    completedAt: a.completedAt ? a.completedAt.toISOString() : null,
    isGold: a.task.isGold,
  }));

  const completed = assignments.filter((a) => a.completedAt).length;
  const overdue = assignments.filter((a) => !a.completedAt && a.dueAt && a.dueAt.getTime() < now.getTime()).length;
  const inProgress = assignments.length - completed - overdue;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Tasks"
        description="Every job assigned to a trainer across all projects — status and time to deadline in one place."
      />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Assigned jobs" value={String(assignments.length)} icon={ListChecks} />
        <KpiCard label="Under completion" value={String(inProgress)} icon={Clock} />
        <KpiCard label="Completed" value={String(completed)} icon={CheckCircle2} />
        <KpiCard label="Overdue" value={String(overdue)} icon={AlertTriangle} />
      </div>
      <TaskAssignmentsTable rows={rows} />
    </div>
  );
}
