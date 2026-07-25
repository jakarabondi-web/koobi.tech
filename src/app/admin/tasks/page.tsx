import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ListChecks } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Tasks" };

export default async function AdminTasksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [tasks, counts] = await Promise.all([
    prisma.task.findMany({
      include: { project: true, assignments: true, _count: { select: { submissions: true } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.task.groupBy({ by: ["status"], _count: true }),
  ]);
  const countFor = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Tasks" description="Task pipeline across all projects." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="In progress" value={String(countFor("ASSIGNED") + countFor("IN_PROGRESS"))} icon={ListChecks} />
        <KpiCard label="Awaiting review" value={String(countFor("SUBMITTED") + countFor("UNDER_REVIEW"))} />
        <KpiCard label="Approved" value={String(countFor("APPROVED"))} />
        <KpiCard label="Escalated" value={String(countFor("ESCALATED"))} />
      </div>
      <Card>
        <CardContent className="pt-6 pb-6">
          {tasks.length === 0 ? <EmptyState icon={ListChecks} title="No tasks yet" /> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Task</TableHead><TableHead>Project</TableHead><TableHead>Assigned</TableHead>
                <TableHead>Submissions</TableHead><TableHead>Gold</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.id.slice(0, 8)}</TableCell>
                    <TableCell className="max-w-52 truncate">{t.project.name}</TableCell>
                    <TableCell className="tabular-nums">{t.assignments.length}</TableCell>
                    <TableCell className="tabular-nums">{t._count.submissions}</TableCell>
                    <TableCell>{t.isGold ? <Badge variant="info">Gold</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
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
