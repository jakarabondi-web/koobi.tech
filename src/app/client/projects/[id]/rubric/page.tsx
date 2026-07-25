import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/db/prisma";
import { loadClientProject } from "@/server/services/client-project";
import { parseCriteria, RUBRIC_PRESETS } from "@/lib/tasks/rubric";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RubricEditor } from "@/components/client/rubric-editor";
import { ProjectTabs } from "@/components/client/project-tabs";

export const metadata: Metadata = { title: "Rubric" };

export default async function RubricPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project } = await loadClientProject(id);

  const [active, history] = await Promise.all([
    prisma.reviewRubric.findFirst({
      where: { projectId: id, isActive: true },
      orderBy: { version: "desc" },
    }),
    prisma.reviewRubric.findMany({
      where: { projectId: id },
      orderBy: { version: "desc" },
      include: { _count: { select: { scores: true } } },
    }),
  ]);

  const criteria = active ? parseCriteria(active.criteria) : RUBRIC_PRESETS.general.criteria;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/client/projects"><ArrowLeft className="size-4" /> All projects</Link>
      </Button>
      <PageHeader
        title={project.name}
        description="What reviewers score submissions against. Clear criteria are the single biggest lever on agreement."
      />
      <ProjectTabs projectId={id} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {active ? `Editing rubric (v${active.version} active)` : "Create a rubric"}
          </CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          <RubricEditor
            projectId={id}
            initialName={active?.name ?? RUBRIC_PRESETS.general.name}
            initialCriteria={criteria}
            currentVersion={active?.version ?? null}
          />
        </CardContent>
      </Card>

      {history.length > 0 ? (
        <Card>
          <CardHeader><CardTitle className="text-base">Version history</CardTitle></CardHeader>
          <CardContent className="pb-6">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Version</TableHead><TableHead>Name</TableHead><TableHead>Criteria</TableHead>
                <TableHead>Scores recorded</TableHead><TableHead>Created</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {history.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-mono text-xs">v{r.version}</TableCell>
                    <TableCell>{r.name}</TableCell>
                    <TableCell className="tabular-nums">{parseCriteria(r.criteria).length}</TableCell>
                    <TableCell className="tabular-nums">{r._count.scores}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell>
                      {r.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Superseded</Badge>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
