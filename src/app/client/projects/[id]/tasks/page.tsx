import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ListChecks } from "lucide-react";

import { prisma } from "@/lib/db/prisma";
import { loadClientProject } from "@/server/services/client-project";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectTabs } from "@/components/client/project-tabs";

export const metadata: Metadata = { title: "Project tasks" };

export default async function ProjectTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project } = await loadClientProject(id);

  const tasks = await prisma.task.findMany({
    where: { projectId: id },
    include: { _count: { select: { submissions: true, assignments: true } } },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/client/projects"><ArrowLeft className="size-4" /> All projects</Link>
      </Button>
      <PageHeader title={project.name} description="Task-level delivery detail." />
      <ProjectTabs projectId={id} />

      <Card>
        <CardContent className="pt-6 pb-6">
          {tasks.length === 0 ? (
            <EmptyState icon={ListChecks} title="No tasks yet"
              description="Tasks appear here once data is imported into this project." />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Task</TableHead><TableHead>Assigned</TableHead><TableHead>Submissions</TableHead>
                <TableHead>Type</TableHead><TableHead>Status</TableHead><TableHead>Updated</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {tasks.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-mono text-xs">{t.id.slice(0, 8)}</TableCell>
                    <TableCell className="tabular-nums">{t._count.assignments}</TableCell>
                    <TableCell className="tabular-nums">{t._count.submissions}</TableCell>
                    <TableCell>{t.isGold ? <Badge variant="info">Gold</Badge> : <span className="text-xs text-muted-foreground">Standard</span>}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.updatedAt.toLocaleDateString()}</TableCell>
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
