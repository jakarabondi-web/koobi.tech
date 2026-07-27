import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserPlus, CheckCircle2 } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { can } from "@/lib/permissions/can";
import { getApplicantReadiness, type ApplicantReadiness } from "@/server/services/trainer-gate";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";
import { Badge } from "@/components/ui/badge";
import { ApplicationReviewActions } from "@/components/admin/application-review";

export const metadata: Metadata = { title: "Trainer applications" };

/**
 * What the reviewer sees for the assessment: the score against the
 * assessment's own pass bar, not a restated pass/fail badge. "72%" next to
 * "needs 80%" is a decision a reviewer can make; "Failed" on its own is
 * just decideApplication's answer repeated back to them.
 */
function AssessmentEvidence({ readiness }: { readiness: ApplicantReadiness }) {
  const attempt = readiness.latestAttempt;
  if (!attempt) {
    return <Badge variant="outline">Assessment not started</Badge>;
  }

  const scorePct = attempt.score != null ? Math.round(attempt.score * 100) : null;
  const thresholdPct = Math.round(attempt.passThreshold * 100);
  const passed = attempt.status === "PASSED";

  return (
    <div className="space-y-0.5">
      <Badge variant={passed ? "success" : attempt.status === "FAILED" ? "destructive" : "outline"}>
        {attempt.assessmentDomain}
        {scorePct != null ? ` — ${scorePct}%` : ` — ${attempt.status.replace(/_/g, " ").toLowerCase()}`}
      </Badge>
      {scorePct != null && !passed ? (
        <p className="text-[11px] text-muted-foreground">Needs {thresholdPct}% to pass</p>
      ) : null}
    </div>
  );
}

/**
 * What the reviewer sees for identity: the overall status, plus which
 * specific check failed when it isn't a clean VERIFIED — "face match
 * failed" tells a reviewer something "Not verified" does not.
 */
function IdentityEvidence({ readiness }: { readiness: ApplicantReadiness }) {
  const checks = readiness.identityChecks;
  const failed =
    checks &&
    ([
      ["Document", checks.documentAuthentic],
      ["Liveness", checks.livenessPassed],
      ["Face match", checks.faceMatchPassed],
      ["Duplicate check", checks.duplicateCheckPassed],
    ] as const).filter(([, v]) => v === "FAIL");

  return (
    <div className="space-y-0.5">
      <StatusBadge status={readiness.identityStatus} />
      {failed && failed.length > 0 ? (
        <p className="text-[11px] text-destructive">{failed.map(([label]) => label).join(", ")} failed</p>
      ) : null}
    </div>
  );
}

export default async function ApplicationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const canApprove = can(session.user.roles, "trainer.approve");

  const [pendingApps, decided, counts] = await Promise.all([
    prisma.application.findMany({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "ADDITIONAL_INFO_REQUIRED"] } },
      include: { user: { include: { trainerProfile: true } } },
      orderBy: { submittedAt: "asc" },
    }),
    prisma.application.findMany({
      where: { status: { in: ["APPROVED", "REJECTED", "WAITLISTED"] } },
      include: { user: true },
      orderBy: { decidedAt: "desc" },
      take: 15,
    }),
    prisma.application.groupBy({ by: ["status"], _count: true }),
  ]);

  // One readiness lookup per applicant — this is the same evidence
  // decideApplication checks server-side, fetched here purely to show the
  // reviewer why Approve is or isn't available, not to re-derive the rule.
  const readinessByUserId = new Map(
    await Promise.all(
      pendingApps.map(async (a) => [a.userId, await getApplicantReadiness(a.userId, a.domain)] as const)
    )
  );
  const pending = pendingApps.map((a) => ({ ...a, readiness: readinessByUserId.get(a.userId)! }));

  const countFor = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trainer applications"
        description="Review applicants and decide who joins the network. Every decision emails the applicant."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Awaiting review" value={String(pending.length)} icon={UserPlus} />
        <KpiCard label="Approved" value={String(countFor("APPROVED"))} icon={CheckCircle2} />
        <KpiCard label="Waitlisted" value={String(countFor("WAITLISTED"))} />
        <KpiCard label="Declined" value={String(countFor("REJECTED"))} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Awaiting review</CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          {pending.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nothing waiting" description="New applications appear here." />
          ) : (
            <>
            {/* Below md the table's horizontal scroller put the decision
                column — the entire point of this page — off-screen with no
                sign it existed, so approving from a phone was impossible.
                Same data and same actions, stacked instead. */}
            <ul className="space-y-3 md:hidden">
              {pending.map((a) => (
                <li key={a.id} className="rounded-lg border border-border p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-medium">{a.user.firstName} {a.user.lastName}</p>
                      <p className="truncate text-xs text-muted-foreground">{a.user.email}</p>
                    </div>
                    <StatusBadge status={a.status} />
                  </div>

                  {a.user.trainerProfile?.headline ? (
                    <p className="mt-2 text-xs text-muted-foreground">{a.user.trainerProfile.headline}</p>
                  ) : null}

                  <dl className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs">
                    <div className="flex gap-1">
                      <dt className="text-muted-foreground">Domain</dt>
                      <dd>{a.domain ?? "—"}</dd>
                    </div>
                    <div className="flex gap-1">
                      <dt className="text-muted-foreground">Submitted</dt>
                      <dd>{a.submittedAt?.toLocaleDateString() ?? "—"}</dd>
                    </div>
                  </dl>

                  <div className="mt-3 flex flex-wrap gap-3">
                    <AssessmentEvidence readiness={a.readiness} />
                    <IdentityEvidence readiness={a.readiness} />
                  </div>

                  <div className="mt-4 border-t border-border pt-3">
                    {canApprove ? (
                      <ApplicationReviewActions
                        applicationId={a.id}
                        applicantName={`${a.user.firstName} ${a.user.lastName}`}
                        readyForApproval={a.readiness.readyForApproval}
                      />
                    ) : (
                      <span className="text-xs text-muted-foreground">View only</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>

            <div className="hidden md:block">
            <Table>
              <TableHeader><TableRow>
                <TableHead>Applicant</TableHead><TableHead>Domain</TableHead>
                <TableHead>Assessment</TableHead><TableHead>Identity</TableHead>
                <TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead><TableHead className="text-right">Decision</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {pending.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <p className="font-medium">{a.user.firstName} {a.user.lastName}</p>
                      <p className="text-xs text-muted-foreground">{a.user.email}</p>
                      {a.user.trainerProfile?.headline ? (
                        <p className="mt-0.5 max-w-sm truncate text-xs text-muted-foreground">
                          {a.user.trainerProfile.headline}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">{a.domain ?? "—"}</TableCell>
                    <TableCell><AssessmentEvidence readiness={a.readiness} /></TableCell>
                    <TableCell><IdentityEvidence readiness={a.readiness} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.submittedAt?.toLocaleDateString() ?? "—"}
                    </TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell className="text-right">
                      {canApprove ? (
                        <ApplicationReviewActions
                          applicationId={a.id}
                          applicantName={`${a.user.firstName} ${a.user.lastName}`}
                          readyForApproval={a.readiness.readyForApproval}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">View only</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recently decided</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {decided.length === 0 ? (
            <EmptyState title="No decisions yet" />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Applicant</TableHead><TableHead>Decided</TableHead><TableHead>Outcome</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {decided.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.user.firstName} {a.user.lastName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.decidedAt?.toLocaleDateString() ?? "—"}</TableCell>
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
