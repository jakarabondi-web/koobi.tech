import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardCheck, CheckCircle2, Handshake, Clock } from "lucide-react";

import { auth } from "@/lib/auth";
import { requireApprovedTrainer } from "@/server/services/trainer-gate";
import { can } from "@/lib/permissions/can";
import { getReviewQueue, getReviewerStats } from "@/server/services/reviews";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Review queue" };

export default async function ReviewQueuePage({
  searchParams,
}: { searchParams: Promise<{ done?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  await requireApprovedTrainer(session.user.id);

  // Reviewing is a distinct capability — a plain trainer can't reach this.
  if (!can(session.user.roles, "task.review")) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
        <ClipboardCheck className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">Reviewer access required</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Reviewing is available to trainers who&apos;ve been promoted to reviewer. Consistently
          strong quality scores are how that happens.
        </p>
      </div>
    );
  }

  const { done } = await searchParams;
  const [queue, stats] = await Promise.all([
    getReviewQueue(session.user.id),
    getReviewerStats(session.user.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Review queue"
        description="Submissions waiting on your judgment. Oldest first."
      />

      {done ? (
        <div className="flex items-center gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm">
          <CheckCircle2 className="size-4 text-success" /> Review recorded.
        </div>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Waiting for you" value={String(queue.length)} icon={Clock} />
        <KpiCard label="Reviews completed" value={String(stats.total)} icon={ClipboardCheck} />
        <KpiCard label="This week" value={String(stats.thisWeek)} />
        <KpiCard
          label="Peer agreement (α)"
          value={stats.peerAgreement === null ? "—" : stats.peerAgreement.toFixed(2)}
          icon={Handshake}
          trend={stats.peerAgreement !== null && stats.peerAgreement >= 0.8 ? "up" : "flat"}
        />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Awaiting review</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {queue.length === 0 ? (
            <EmptyState
              icon={CheckCircle2}
              title="Queue is clear"
              description="Nothing is waiting on you right now. New submissions appear here automatically."
            />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Submission</TableHead><TableHead>Project</TableHead><TableHead>Type</TableHead>
                <TableHead>Time taken</TableHead><TableHead>Submitted</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {queue.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-mono text-xs">{s.id.slice(0, 8)}</TableCell>
                    <TableCell className="max-w-52 truncate">{s.task.project.name}</TableCell>
                    <TableCell>
                      {s.task.isGold ? <Badge variant="info">Gold</Badge> : (
                        <span className="text-xs text-muted-foreground">
                          {s.task.project.taskType.replace(/_/g, " ").toLowerCase()}
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="tabular-nums text-xs">
                      {s.durationSeconds ? `${Math.round(s.durationSeconds / 60)}m` : "—"}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {s.submittedAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="violet" asChild>
                        <Link href={`/trainer/review/${s.id}`}>Review</Link>
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <p className="text-xs text-muted-foreground">
        Reviewer decisions are themselves calibrated — your agreement with peers and lead
        adjudicators is tracked, because unchecked reviewers drift too.
      </p>
    </div>
  );
}
