import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Users, EyeOff } from "lucide-react";

import { prisma } from "@/lib/db/prisma";
import { loadClientProject } from "@/server/services/client-project";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectTabs } from "@/components/client/project-tabs";

export const metadata: Metadata = { title: "Project workforce" };

export default async function ProjectWorkforcePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project } = await loadClientProject(id);

  const assignments = await prisma.projectAssignment.findMany({
    where: { projectId: id },
    orderBy: { assignedAt: "desc" },
  });

  // Clients see aggregate capability, not identities. We surface country,
  // domain, and quality band — never names or contact details.
  const profiles = assignments.length
    ? await prisma.trainerProfile.findMany({
        where: { userId: { in: assignments.map((a) => a.userId) } },
        select: { userId: true, country: true, qualityScore: true, availableHoursPerWeek: true },
      })
    : [];

  const submissionCounts = assignments.length
    ? await prisma.taskSubmission.groupBy({
        by: ["submittedById"],
        where: { task: { projectId: id }, submittedById: { in: assignments.map((a) => a.userId) } },
        _count: true,
      })
    : [];

  const countries = [...new Set(profiles.map((p) => p.country).filter(Boolean))];
  const avgQuality = profiles.length
    ? profiles.reduce((s, p) => s + (p.qualityScore ?? 0), 0) / profiles.length
    : null;

  const band = (q: number | null) =>
    q === null ? "—" : q >= 0.9 ? "Excellent" : q >= 0.8 ? "Strong" : q >= 0.7 ? "Good" : "Developing";

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/client/projects"><ArrowLeft className="size-4" /> All projects</Link>
      </Button>
      <PageHeader title={project.name} description="The expert pool working on this project." />
      <ProjectTabs projectId={id} />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Experts assigned" value={String(assignments.length)} icon={Users} />
        <KpiCard label="Countries represented" value={String(countries.length)} />
        <KpiCard label="Average quality" value={avgQuality === null ? "—" : `${Math.round(avgQuality * 100)}%`} />
      </div>

      <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
        <EyeOff className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground">
          Expert identities are withheld by design. You see capability, location, and quality —
          not names or contact details — which protects workers and keeps evaluation unbiased.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Assigned experts</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {assignments.length === 0 ? (
            <EmptyState icon={Users} title="No experts assigned yet"
              description="Once the project is active, matched experts appear here." />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Expert</TableHead><TableHead>Country</TableHead><TableHead>Quality</TableHead>
                <TableHead>Submissions</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {assignments.map((a, i) => {
                  const p = profiles.find((x) => x.userId === a.userId);
                  const subs = submissionCounts.find((s) => s.submittedById === a.userId)?._count ?? 0;
                  return (
                    <TableRow key={a.id}>
                      <TableCell className="font-mono text-xs">Expert #{String(i + 1).padStart(3, "0")}</TableCell>
                      <TableCell className="text-sm">{p?.country ?? "—"}</TableCell>
                      <TableCell><Badge variant="secondary">{band(p?.qualityScore ?? null)}</Badge></TableCell>
                      <TableCell className="tabular-nums">{subs}</TableCell>
                      <TableCell><Badge variant={a.status === "ACTIVE" ? "success" : "outline"}>{a.status.toLowerCase()}</Badge></TableCell>
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
