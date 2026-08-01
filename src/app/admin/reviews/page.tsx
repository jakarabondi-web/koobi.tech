import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardCheck, Scale } from "lucide-react";

import { auth } from "@/lib/auth";
import { can } from "@/lib/permissions/can";
import { prisma } from "@/lib/db/prisma";
import { getAdjudicationQueue } from "@/server/services/adjudication";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Reviews" };

export default async function ReviewsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const canAdjudicate = can(session.user.roles, "task.adjudicate");

  const [queue, recent, counts, adjudicationQueue] = await Promise.all([
    prisma.taskSubmission.findMany({
      where: { reviews: { none: {} } },
      include: { task: { include: { project: true } }, submittedBy: true },
      orderBy: { submittedAt: "asc" },
      take: 50,
    }),
    prisma.review.findMany({
      include: { reviewer: true, submission: { include: { task: { include: { project: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.review.groupBy({ by: ["decision"], _count: true }),
    canAdjudicate ? getAdjudicationQueue() : Promise.resolve([]),
  ]);
  const countFor = (d: string) => counts.find((c) => c.decision === d)?._count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review queue"
        description="Submissions awaiting review, and recent decisions."
        actions={
          canAdjudicate ? (
            <Button size="sm" variant="outline" asChild>
              <Link href="/admin/reviews/adjudication">
                <Scale className="size-4" /> Adjudication{adjudicationQueue.length > 0 ? ` (${adjudicationQueue.length})` : ""}
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Awaiting review" value={String(queue.length)} icon={ClipboardCheck} />
        <KpiCard label="Approved" value={String(countFor("APPROVED"))} />
        <KpiCard label="Revisions requested" value={String(countFor("REVISION_REQUESTED"))} />
        <KpiCard label="Escalated" value={String(countFor("ESCALATED"))} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Unreviewed submissions</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {queue.length === 0 ? (
            <EmptyState icon={ClipboardCheck} title="Queue is clear" description="Every submission has been reviewed." />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Submission</TableHead><TableHead>Project</TableHead>
                <TableHead>Duration</TableHead><TableHead>Submitted</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {queue.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.id.slice(0, 8)}</TableCell>
                    <TableCell className="max-w-52 truncate">{s.task.project.name}</TableCell>
                    <TableCell className="tabular-nums text-xs">{s.durationSeconds ? `${Math.round(s.durationSeconds / 60)}m` : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{s.submittedAt.toLocaleDateString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            Reviewer identity is withheld from this list by design — trainer names are shown only to
            authorized roles on the trainer detail page.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent decisions</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {recent.length === 0 ? <EmptyState title="No reviews yet" /> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Project</TableHead><TableHead>Reviewer</TableHead>
                <TableHead>Decision</TableHead><TableHead>Confidence</TableHead><TableHead>Date</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {recent.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-52 truncate">{r.submission.task.project.name}</TableCell>
                    <TableCell className="text-sm">{r.reviewer.firstName} {r.reviewer.lastName}</TableCell>
                    <TableCell>
                      <Badge variant={r.decision === "APPROVED" ? "success" : r.decision === "REJECTED" ? "destructive" : "warning"}>
                        {r.decision.replace(/_/g, " ").toLowerCase()}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{r.confidence != null ? `${Math.round(r.confidence * 100)}%` : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{r.createdAt.toLocaleDateString()}</TableCell>
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
