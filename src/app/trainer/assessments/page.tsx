import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GraduationCap, Clock } from "lucide-react";

import { auth } from "@/lib/auth";
import { listAssessmentsForUser } from "@/server/services/assessments";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/badge-status";
import { BeginAssessmentButton } from "@/components/trainer/begin-assessment-button";

export const metadata: Metadata = { title: "Assessments" };

export default async function AssessmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const items = await listAssessmentsForUser(session.user.id);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Qualification assessments"
        description="Pass an assessment in your domain to unlock paid project work."
      />

      {items.length === 0 ? (
        <EmptyState icon={GraduationCap} title="No assessments available" description="Check back shortly." />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map(({ assessment, attempt, attemptsUsed, locked }) => {
            const passed = attempt?.status === "PASSED";
            const underReview = attempt?.status === "UNDER_REVIEW";
            const exhausted = attemptsUsed >= assessment.maxAttempts && !passed && !underReview;
            return (
              <Card key={assessment.id}>
                <CardContent className="space-y-3 pt-5 pb-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold">{assessment.title}</h3>
                      <p className="text-xs text-muted-foreground">{assessment.domain}</p>
                    </div>
                    {attempt ? (
                      <StatusBadge status={attempt.status} />
                    ) : locked ? (
                      <Badge variant="outline">Locked</Badge>
                    ) : (
                      <Badge variant="outline">Available</Badge>
                    )}
                  </div>

                  <p className="text-sm text-muted-foreground">{assessment.description}</p>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {assessment.timeLimitMins ? `${assessment.timeLimitMins} min` : "Untimed"}
                    </span>
                    <span>Pass mark {Math.round(assessment.passThreshold * 100)}%</span>
                    <span>{attemptsUsed} / {assessment.maxAttempts} attempts used</span>
                  </div>

                  {attempt?.score != null && !underReview ? (
                    <p className="text-sm">
                      Your score: <span className="font-medium">{Math.round(attempt.score * 100)}%</span>
                    </p>
                  ) : null}

                  {passed ? (
                    <p className="text-sm font-medium text-success">Passed — you&apos;re qualified for this domain.</p>
                  ) : underReview ? (
                    // The multiple-choice portion is auto-graded the moment you
                    // submit, but a written answer still needs a person to read
                    // it — showing a score here, or letting a retake start,
                    // would both imply this is finished when it isn't.
                    <p className="text-sm text-muted-foreground">
                      Submitted — your written answer is with a reviewer. You&apos;ll be notified once it&apos;s scored.
                    </p>
                  ) : exhausted ? (
                    <p className="text-sm text-muted-foreground">
                      No attempts remaining. Contact support if you&apos;d like this reviewed.
                    </p>
                  ) : locked ? (
                    <p className="text-sm text-muted-foreground">
                      Pass the screening quiz first to unlock this exam.
                    </p>
                  ) : (
                    <BeginAssessmentButton
                      assessmentId={assessment.id}
                      resuming={attempt?.status === "IN_PROGRESS"}
                    />
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
