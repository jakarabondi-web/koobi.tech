import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Scale, CheckCircle2, Handshake } from "lucide-react";

import { auth } from "@/lib/auth";
import { requireApprovedTrainer } from "@/server/services/trainer-gate";
import { can } from "@/lib/permissions/can";
import { getAdjudicationQueue, getReviewerCalibration } from "@/server/services/adjudication";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { AdjudicationPanel, type AdjudicationItem } from "@/components/tasks/adjudication-panel";

export const metadata: Metadata = { title: "Adjudication" };

export default async function AdjudicationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  await requireApprovedTrainer(session.user.id);

  if (!can(session.user.roles, "task.adjudicate")) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border py-20 text-center">
        <Scale className="size-8 text-muted-foreground" />
        <p className="text-sm font-medium">Lead reviewer access required</p>
        <p className="max-w-sm text-sm text-muted-foreground">
          Adjudication settles cases reviewers disagreed on, so it&apos;s limited to lead reviewers
          and quality managers.
        </p>
      </div>
    );
  }

  const [queue, calibration] = await Promise.all([
    getAdjudicationQueue(),
    getReviewerCalibration(),
  ]);

  const items: AdjudicationItem[] = queue.map((a) => {
    const payload = a.submission.task.payload as {
      prompt?: string; responseA?: string; responseB?: string;
    };
    const content = a.submission.content as { preferred?: string; justification?: string };
    return {
      id: a.id,
      reason: a.reason,
      projectName: a.submission.task.project.name,
      prompt: payload.prompt ?? "",
      responseA: payload.responseA ?? "",
      responseB: payload.responseB ?? "",
      preferred: content.preferred,
      justification: content.justification,
      goldAnswer: a.submission.task.goldTask
        ? String((a.submission.task.goldTask.expectedAnswer as { answer?: string })?.answer ?? "")
        : null,
      reviews: a.submission.reviews.map((r) => ({
        reviewer: `${r.reviewer.firstName} ${r.reviewer.lastName}`,
        decision: r.decision,
        feedback: r.feedback,
        confidence: r.confidence,
      })),
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adjudication"
        description="Cases reviewers disagreed on, or escalated. Your call is final."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Waiting on you" value={String(queue.length)} icon={Scale} />
        <KpiCard label="Reviewers tracked" value={String(calibration.reviewers.length)} icon={Handshake} />
        <KpiCard
          label="Reviewer agreement (α)"
          value={calibration.overallAlpha === null ? "—" : calibration.overallAlpha.toFixed(2)}
        />
      </div>

      {items.length === 0 ? (
        <EmptyState
          icon={CheckCircle2}
          title="Nothing to adjudicate"
          description="Submissions arrive here when reviewers reach different decisions, or when a reviewer escalates."
        />
      ) : (
        <div className="space-y-5">
          {items.map((item) => <AdjudicationPanel key={item.id} item={item} />)}
        </div>
      )}

      {calibration.reviewers.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Reviewer calibration</CardTitle>
            <CardDescription>
              How often each reviewer&apos;s decision matched the final adjudication. Low agreement
              is a coaching signal, not grounds for removal on its own.
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-6">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Reviewer</TableHead><TableHead>Adjudicated</TableHead><TableHead>Agreement with lead</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {calibration.reviewers.map((r) => (
                  <TableRow key={r.reviewerId}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell className="tabular-nums">{r.reviewsAdjudicated}</TableCell>
                    <TableCell>
                      {r.agreementWithLead === null ? "—" : (
                        <Badge variant={r.agreementWithLead >= 0.8 ? "success" : r.agreementWithLead >= 0.6 ? "warning" : "destructive"}>
                          {Math.round(r.agreementWithLead * 100)}%
                        </Badge>
                      )}
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
