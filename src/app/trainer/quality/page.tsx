import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Gauge, Target, RefreshCw, XCircle, Timer, Handshake } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

export const metadata: Metadata = { title: "Quality" };

const pct = (v: number | null | undefined) => (v == null ? "—" : `${Math.round(v * 100)}%`);

export default async function QualityPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const [profile, snapshot, reviews, goldResults] = await Promise.all([
    prisma.trainerProfile.findUnique({ where: { userId } }),
    prisma.qualitySnapshot.findFirst({
      where: { trainer: { userId } },
      orderBy: { periodEnd: "desc" },
    }),
    prisma.review.findMany({
      where: { submission: { submittedById: userId } },
      include: { submission: { include: { task: { include: { project: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    prisma.goldTaskResult.findMany({ where: { userId } }),
  ]);

  const approved = reviews.filter((r) => r.decision === "APPROVED").length;
  const revisions = reviews.filter((r) => r.decision === "REVISION_REQUESTED").length;
  const rejected = reviews.filter((r) => r.decision === "REJECTED").length;
  const goldRate = goldResults.length
    ? goldResults.filter((g) => g.passed).length / goldResults.length
    : null;

  const dimensions = [
    { label: "Accuracy", value: snapshot?.accuracy ?? goldRate, icon: Target },
    { label: "Reviewer agreement", value: snapshot?.reviewerAgreement, icon: Handshake },
    { label: "Instruction following", value: snapshot?.instructionFollowing, icon: Gauge },
    { label: "Completion reliability", value: snapshot?.completionReliability ?? profile?.reliabilityScore, icon: Timer },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Your quality profile"
        description="We track several dimensions separately — no single number decides your eligibility."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Overall quality" value={pct(profile?.qualityScore)} icon={Gauge} />
        <KpiCard label="Gold task pass rate" value={pct(goldRate)} icon={Target} />
        <KpiCard label="Revision rate" value={reviews.length ? `${Math.round((revisions / reviews.length) * 100)}%` : "—"} icon={RefreshCw} />
        <KpiCard label="Rejection rate" value={reviews.length ? `${Math.round((rejected / reviews.length) * 100)}%` : "—"} icon={XCircle} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader><CardTitle className="text-base">Quality dimensions</CardTitle></CardHeader>
          <CardContent className="space-y-4 pb-6">
            {dimensions.map((d) => (
              <div key={d.label}>
                <div className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2"><d.icon className="size-4 text-muted-foreground" />{d.label}</span>
                  <span className="font-medium tabular-nums">{pct(d.value)}</span>
                </div>
                <Progress value={(d.value ?? 0) * 100} className="mt-1.5" />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Dimensions fill in as you complete more reviewed work.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Recent reviewer feedback</CardTitle></CardHeader>
          <CardContent className="pb-6">
            {reviews.length === 0 ? (
              <EmptyState title="No feedback yet" description="Reviewer notes on your submissions appear here." />
            ) : (
              <ul className="space-y-3">
                {reviews.map((r) => (
                  <li key={r.id} className="space-y-1 border-b border-border pb-3 last:border-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{r.submission.task.project.name}</p>
                      <Badge variant={r.decision === "APPROVED" ? "success" : r.decision === "REJECTED" ? "destructive" : "warning"}>
                        {r.decision.replace(/_/g, " ").toLowerCase()}
                      </Badge>
                    </div>
                    {r.feedback ? <p className="text-xs text-muted-foreground">{r.feedback}</p> : null}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        {approved} of your last {reviews.length || 0} reviewed submissions were approved.
      </p>
    </div>
  );
}
