import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList } from "lucide-react";

import { auth } from "@/lib/auth";
import { requireApprovedTrainer } from "@/server/services/trainer-gate";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "My projects" };

export default async function MyProjectsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  await requireApprovedTrainer(session.user.id);
  const userId = session.user.id;

  const [assignments, applications] = await Promise.all([
    prisma.projectAssignment.findMany({ where: { userId }, orderBy: { assignedAt: "desc" } }),
    prisma.projectApplication.findMany({
      where: { userId },
      include: { project: true },
      orderBy: { appliedAt: "desc" },
    }),
  ]);

  const assignedProjects = assignments.length
    ? await prisma.project.findMany({ where: { id: { in: assignments.map((a) => a.projectId) } } })
    : [];

  return (
    <div className="space-y-6">
      <PageHeader title="My projects" description="Projects you're assigned to and applications in flight." />

      <Card>
        <CardHeader><CardTitle className="text-base">Active assignments</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {assignedProjects.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No active assignments"
              description="Apply to projects in the marketplace to get started."
              action={<Button size="sm" asChild><Link href="/trainer/projects">Browse marketplace</Link></Button>}
            />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Project</TableHead><TableHead>Domain</TableHead>
                <TableHead>Status</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {assignedProjects.map((p) => {
                  const a = assignments.find((x) => x.projectId === p.id)!;
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="font-medium">{p.name}</TableCell>
                      <TableCell>{p.domain}</TableCell>
                      <TableCell><StatusBadge status={a.status} /></TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" asChild>
                          <Link href={`/trainer/projects/${p.id}`}>Open</Link>
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Applications</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {applications.length === 0 ? (
            <EmptyState title="No applications yet" description="Applications you submit will show here." />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Project</TableHead><TableHead>Applied</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {applications.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.project.name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.appliedAt.toLocaleDateString()}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
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
