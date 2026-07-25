import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, Gauge, Target, Handshake, RefreshCw, AlertTriangle } from "lucide-react";

import { prisma } from "@/lib/db/prisma";
import { loadClientProject } from "@/server/services/client-project";
import { krippendorffAlpha, majorityAgreement, bandFor, type Rating } from "@/lib/analytics/agreement";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ProjectTabs } from "@/components/client/project-tabs";

export const metadata: Metadata = { title: "Project quality" };

export default async function ProjectQualityPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project } = await loadClientProject(id);

  const [submissions, reviews, goldResults] = await Promise.all([
    prisma.taskSubmission.findMany({
      where: { task: { projectId: id } },
      select: { taskId: true, submittedById: true, content: true },
      take: 1000,
    }),
    prisma.review.findMany({
      where: { submission: { task: { projectId: id } } },
      select: { decision: true, confidence: true },
    }),
    prisma.goldTaskResult.findMany({
      where: { goldTask: { projectId: id } },
      select: { passed: true },
    }),
  ]);

  const ratings: Rating[] = submissions
    .map((s) => {
      const c = s.content as { preferred?: string } | null;
      return c?.preferred ? { itemId: s.taskId, raterId: s.submittedById, value: c.preferred } : null;
    })
    .filter((r): r is Rating => r !== null);

  const alpha = krippendorffAlpha(ratings);
  const majority = majorityAgreement(ratings);
  const band = bandFor(alpha);

  const approved = reviews.filter((r) => r.decision === "APPROVED").length;
  const revisions = reviews.filter((r) => r.decision === "REVISION_REQUESTED").length;
  const acceptanceRate = reviews.length ? approved / reviews.length : null;
  const goldRate = goldResults.length ? goldResults.filter((g) => g.passed).length / goldResults.length : null;

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/client/projects"><ArrowLeft className="size-4" /> All projects</Link>
      </Button>
      <PageHeader title={project.name} description="Quality signals for this project's data." />
      <ProjectTabs projectId={id} />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Krippendorff's α" value={alpha === null ? "—" : alpha.toFixed(2)} icon={Handshake}
          trendLabel={band ?? undefined}
          trend={band === "reliable" ? "up" : band === "unreliable" ? "down" : "flat"} />
        <KpiCard label="Majority agreement" value={majority === null ? "—" : `${Math.round(majority * 100)}%`} icon={Gauge} />
        <KpiCard label="Gold pass rate" value={goldRate === null ? "—" : `${Math.round(goldRate * 100)}%`} icon={Target} />
        <KpiCard label="Acceptance rate" value={acceptanceRate === null ? "—" : `${Math.round(acceptanceRate * 100)}%`} icon={RefreshCw} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Reading these numbers</CardTitle></CardHeader>
        <CardContent className="space-y-3 pb-6 text-sm text-muted-foreground">
          <p>
            Krippendorff&apos;s α corrects for agreement that would occur by chance, so it&apos;s a
            stricter measure than raw percentage agreement. Two annotators picking randomly between
            two options already agree half the time — α accounts for that.
          </p>
          <ul className="space-y-1">
            <li>• <span className="font-medium text-foreground">α ≥ 0.80</span> — reliable</li>
            <li>• <span className="font-medium text-foreground">0.67–0.80</span> — tentative</li>
            <li>• <span className="font-medium text-foreground">below 0.67</span> — usually means the rubric is ambiguous</li>
          </ul>
          {alpha !== null && alpha < 0.67 ? (
            <p className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-warning-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              Agreement is below the reliable threshold on this project. In our experience that
              points to ambiguity in the instructions rather than to the experts — worth reviewing
              the wording before drawing conclusions from the data.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Review outcomes</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {reviews.length === 0 ? (
            <EmptyState title="No reviews yet" description="Quality signals populate as submissions are reviewed." />
          ) : (
            <div className="flex flex-wrap gap-4 text-sm">
              <div className="flex items-center gap-2"><Badge variant="success">Approved</Badge><span className="tabular-nums">{approved}</span></div>
              <div className="flex items-center gap-2"><Badge variant="warning">Revision requested</Badge><span className="tabular-nums">{revisions}</span></div>
              <div className="flex items-center gap-2"><Badge variant="destructive">Rejected</Badge><span className="tabular-nums">{reviews.filter((r) => r.decision === "REJECTED").length}</span></div>
              <div className="flex items-center gap-2"><Badge variant="outline">Escalated</Badge><span className="tabular-nums">{reviews.filter((r) => r.decision === "ESCALATED").length}</span></div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
