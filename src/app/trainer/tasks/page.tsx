import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ListChecks } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getTrainerGate } from "@/server/services/trainer-gate";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { GateBlocked } from "@/components/trainer/gate-banner";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "My tasks" };

export default async function TasksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const gate = await getTrainerGate(session.user.id);
  if (!gate.canAccessAssignments) {
    return (
      <div className="space-y-6">
        <PageHeader title="My tasks" />
        <GateBlocked gate={gate} />
      </div>
    );
  }

  const assignments = await prisma.taskAssignment.findMany({
    where: { userId: session.user.id },
    include: { task: { include: { project: true } } },
    orderBy: [{ completedAt: "asc" }, { dueAt: "asc" }],
  });

  return (
    <div className="space-y-6">
      <PageHeader title="My tasks" description="Tasks assigned to you across all your projects." />
      <Card>
        <CardContent className="pt-6 pb-6">
          {assignments.length === 0 ? (
            <EmptyState
              icon={ListChecks}
              title="No tasks assigned"
              description="Once you're matched to a project, your tasks appear here."
              action={<Button size="sm" asChild><Link href="/trainer/projects">Browse projects</Link></Button>}
            />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Task</TableHead><TableHead>Project</TableHead>
                <TableHead>Due</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {assignments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-mono text-xs">{a.taskId.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{a.task.project.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.dueAt?.toLocaleDateString() ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={a.task.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant={a.completedAt ? "outline" : "default"} asChild>
                        <Link href={`/trainer/tasks/${a.taskId}`}>{a.completedAt ? "View" : "Work on it"}</Link>
                      </Button>
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
