import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { BarChart3, Target, Handshake, AlertTriangle } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { krippendorffAlpha, majorityAgreement, bandFor, type Rating } from "@/lib/analytics/agreement";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Quality dashboard" };

export default async function AdminQualityPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [submissions, goldResults, reviews, lowPerformers] = await Promise.all([
    prisma.taskSubmission.findMany({
      select: { taskId: true, submittedById: true, content: true },
      take: 500,
    }),
    prisma.goldTaskResult.findMany({ select: { passed: true } }),
    prisma.review.findMany({ select: { decision: true } }),
    prisma.trainerProfile.findMany({
      where: { qualityScore: { lt: 0.75, gt: 0 } },
      include: { user: true },
      orderBy: { qualityScore: "asc" },
      take: 10,
    }),
  ]);

  // Agreement is computed over trainers who rated the same task.
  const ratings: Rating[] = submissions
    .map((s) => {
      const c = s.content as { preferred?: string } | null;
      return c?.preferred
        ? { itemId: s.taskId, raterId: s.submittedById, value: c.preferred }
        : null;
    })
    .filter((r): r is Rating => r !== null);

  const alpha = krippendorffAlpha(ratings);
  const majority = majorityAgreement(ratings);
  const band = bandFor(alpha);

  const goldRate = goldResults.length ? goldResults.filter((g) => g.passed).length / goldResults.length : null;
  const approvalRate = reviews.length
    ? reviews.filter((r) => r.decision === "APPROVED").length / reviews.length
    : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Quality dashboard"
        description="Agreement, gold-task accuracy, and trainers who may need support."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Krippendorff's α" value={alpha === null ? "—" : alpha.toFixed(2)} icon={Handshake}
          trendLabel={band ?? undefined} trend={band === "reliable" ? "up" : band === "unreliable" ? "down" : "flat"} />
        <KpiCard label="Majority agreement" value={majority === null ? "—" : `${Math.round(majority * 100)}%`} icon={BarChart3} />
        <KpiCard label="Gold pass rate" value={goldRate === null ? "—" : `${Math.round(goldRate * 100)}%`} icon={Target} />
        <KpiCard label="Approval rate" value={approvalRate === null ? "—" : `${Math.round(approvalRate * 100)}%`} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">How to read agreement</CardTitle></CardHeader>
        <CardContent className="pb-6 text-sm text-muted-foreground">
          <p>
            Krippendorff&apos;s α corrects for agreement that would happen by chance, so it&apos;s a
            harsher and more honest measure than raw percentage agreement.
          </p>
          <ul className="mt-2 space-y-1">
            <li>• <span className="font-medium text-foreground">α ≥ 0.80</span> — reliable, safe to ship</li>
            <li>• <span className="font-medium text-foreground">0.67–0.80</span> — tentative, use with caution</li>
            <li>• <span className="font-medium text-foreground">below 0.67</span> — usually the rubric is ambiguous, not the trainers</li>
          </ul>
          {alpha !== null && alpha < 0.67 ? (
            <p className="mt-3 flex items-start gap-2 text-warning-foreground">
              <AlertTriangle className="mt-0.5 size-4 shrink-0" />
              Current agreement is below the reliable threshold — review the rubric wording before
              attributing this to individual trainers.
            </p>
          ) : null}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Trainers who may need support</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {lowPerformers.length === 0 ? (
            <EmptyState title="No trainers below threshold" description="Everyone is performing above the quality floor." />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Trainer</TableHead><TableHead>Quality</TableHead><TableHead>Reliability</TableHead></TableRow></TableHeader>
              <TableBody>
                {lowPerformers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>{t.user.firstName} {t.user.lastName}</TableCell>
                    <TableCell><Badge variant="warning">{Math.round((t.qualityScore ?? 0) * 100)}%</Badge></TableCell>
                    <TableCell className="tabular-nums">{Math.round((t.reliabilityScore ?? 0) * 100)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          <p className="mt-4 text-xs text-muted-foreground">
            A low score is a prompt for coaching, not an automatic penalty — no enforcement action is
            taken from this screen.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
