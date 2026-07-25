import type { Metadata } from "next";
import Link from "next/link";
import { Briefcase, Plus } from "lucide-react";

import { prisma } from "@/lib/db/prisma";
import { requireTenant } from "@/server/services/tenant";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Projects" };
const usd = (c: number | null) => (c === null ? "—" : `$${(c / 100).toFixed(2)}`);

export default async function ClientProjectsPage() {
  const tenant = await requireTenant();

  const projects = await prisma.project.findMany({
    where: { organizationId: tenant.organizationId },
    include: { _count: { select: { tasks: true, assignments: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Projects"
        description={`${projects.length} project${projects.length === 1 ? "" : "s"} in ${tenant.organizationName}.`}
        actions={
          <Button variant="violet" asChild>
            <Link href="/client/projects/new"><Plus className="size-4" /> Create project</Link>
          </Button>
        }
      />
      <Card>
        <CardContent className="pt-6 pb-6">
          {projects.length === 0 ? (
            <EmptyState
              icon={Briefcase}
              title="No projects yet"
              description="Create your first project to start collecting human-verified training data."
              action={<Button size="sm" asChild><Link href="/client/projects/new">Create project</Link></Button>}
            />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Project</TableHead><TableHead>Task type</TableHead><TableHead>Tasks</TableHead>
                <TableHead>Experts</TableHead><TableHead>Pay/task</TableHead><TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {projects.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell>
                      <p className="font-medium">{p.name}</p>
                      <p className="max-w-sm truncate text-xs text-muted-foreground">{p.domain}</p>
                    </TableCell>
                    <TableCell className="text-xs">{p.taskType.replace(/_/g, " ").toLowerCase()}</TableCell>
                    <TableCell className="tabular-nums">{p._count.tasks}</TableCell>
                    <TableCell className="tabular-nums">{p._count.assignments}</TableCell>
                    <TableCell className="tabular-nums">{usd(p.payPerTaskCents)}</TableCell>
                    <TableCell><StatusBadge status={p.status} /></TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild>
                        <Link href={`/client/projects/${p.id}`}>Open</Link>
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
