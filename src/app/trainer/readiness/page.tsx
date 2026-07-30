import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Medal, Clock, TrendingUp } from "lucide-react";

import { auth } from "@/lib/auth";
import { requireApprovedTrainer } from "@/server/services/trainer-gate";
import { getSkillProfile, listReadinessForUser, TIER_LABELS } from "@/server/services/readiness";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/badge-status";
import { Progress } from "@/components/ui/progress";
import { BeginAssessmentButton } from "@/components/trainer/begin-assessment-button";

export const metadata: Metadata = { title: "Readiness program" };

export default async function ReadinessPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  await requireApprovedTrainer(session.user.id);

  const [profile, items] = await Promise.all([
    getSkillProfile(session.user.id),
    listReadinessForUser(session.user.id),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Readiness program"
        description="Skill-mapped exams that build your trainer profile. Your scores shape which projects you're matched with — stronger profiles get first access to specialist work."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard
          label="Overall readiness"
          value={profile.overall != null ? `${Math.round(profile.overall * 100)}%` : "—"}
          icon={TrendingUp}
        />
        <KpiCard
          label="Tier"
          value={profile.tier ? TIER_LABELS[profile.tier] : "Not yet ranked"}
          icon={Medal}
        />
        <KpiCard label="Exams completed" value={String(profile.examsCompleted)} />
      </div>

      {profile.skills.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your skill profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-6">
            {profile.skills.map((s) => (
              <div key={s.skillArea} className="space-y-1">
                <div className="flex items-baseline justify-between text-sm">
                  <span>{s.skillArea}</span>
                  <span className="font-medium">{Math.round(s.score * 100)}%</span>
                </div>
                <Progress value={s.score * 100} />
                <p className="text-[11px] text-muted-foreground">
                  {s.questionsGraded} question{s.questionsGraded === 1 ? "" : "s"} graded
                </p>
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      {items.length === 0 ? (
        <EmptyState
          icon={Medal}
          title="No readiness exams available yet"
          description="Exams for your domain appear here as they're published."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map(({ assessment, attempt, attemptsUsed }) => {
            const underReview = attempt?.status === "UNDER_REVIEW";
            const completed = attempt?.status === "PASSED" || attempt?.status === "FAILED";
            const exhausted = attemptsUsed >= assessment.maxAttempts && !underReview;
            return (
              <Card key={assessment.id}>
                <CardContent className="space-y-3 pt-5 pb-5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-semibold">{assessment.title}</h3>
                      <p className="text-xs text-muted-foreground">{assessment.domain}</p>
                    </div>
                    {attempt ? <StatusBadge status={attempt.status} /> : <Badge variant="outline">Available</Badge>}
                  </div>

                  <p className="text-sm text-muted-foreground">{assessment.description}</p>

                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Clock className="size-3" />
                      {assessment.timeLimitMins ? `${assessment.timeLimitMins} min` : "Untimed"}
                    </span>
                    <span>{attemptsUsed} / {assessment.maxAttempts} attempts used</span>
                  </div>

                  {attempt?.score != null && !underReview ? (
                    <p className="text-sm">
                      Your score: <span className="font-medium">{Math.round(attempt.score * 100)}%</span>
                    </p>
                  ) : null}

                  {underReview ? (
                    <p className="text-sm text-muted-foreground">
                      Submitted — written answers are with a reviewer. Your skill profile updates once they&apos;re scored.
                    </p>
                  ) : completed && exhausted ? (
                    <p className="text-sm text-muted-foreground">
                      Completed — this exam&apos;s results are in your profile above.
                    </p>
                  ) : exhausted ? (
                    <p className="text-sm text-muted-foreground">No attempts remaining.</p>
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
