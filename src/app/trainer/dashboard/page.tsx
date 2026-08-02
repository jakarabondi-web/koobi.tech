import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase, CheckCircle2, Clock, DollarSign, Gauge, ArrowRight, MessageSquareText } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/ui/badge-status";
import { WeeklyTaskChart, type WeeklyTaskPoint } from "@/components/charts/weekly-task-chart";
import { GateBanner } from "@/components/trainer/gate-banner";
import { OnboardingProgress } from "@/components/trainer/onboarding-progress";
import { getTrainerGate } from "@/server/services/trainer-gate";
import { credentialExpiryStatus, daysUntil } from "@/lib/utils/credential-expiry";

export const metadata: Metadata = { title: "Dashboard" };

function formatCents(cents: number) {
  return (cents / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });
}

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function buildWeeklySeries(
  submissions: { submittedAt: Date }[],
  reviews: { createdAt: Date }[]
): WeeklyTaskPoint[] {
  const today = new Date();
  const days: WeeklyTaskPoint[] = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const completed = submissions.filter((s) => s.submittedAt.toDateString() === d.toDateString()).length;
    const reviewed = reviews.filter((r) => r.createdAt.toDateString() === d.toDateString()).length;
    days.push({ day: DAY_LABELS[d.getDay()], completed, reviewed });
  }
  return days;
}

export default async function TrainerDashboardPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const userId = session.user.id;

  const gate = await getTrainerGate(userId);

  // An applicant gets their status and nothing else. Returning before the
  // queries below is deliberate: earnings, quality scores and task history
  // are all necessarily empty at this point, and rendering them as zeroes
  // alongside "Browse projects" reads as a working account with no work in
  // it, rather than an application still being decided.
  if (!gate.canAccessAssignments) {
    return (
      <div className="space-y-8">
        <PageHeader
          title={`Welcome, ${session.user.name?.split(" ")[0] ?? "there"}`}
          description="Here's where your application stands."
        />
        <GateBanner gate={gate} />
        <OnboardingProgress gate={gate} />
        <Card>
          <CardHeader>
            <CardTitle className="text-base">What happens next</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 pb-6 text-sm text-muted-foreground">
            <p>
              Once you&apos;ve passed the assessment, our team reviews your application. We&apos;ll
              email you as soon as there&apos;s a decision — you don&apos;t need to check back.
            </p>
            <p>
              After you&apos;re approved, work through a short readiness program so we can see
              what you&apos;re strongest at. Verifying your identity is the last step after
              that — projects, tasks and earnings unlock once it&apos;s complete. If anything
              here looks wrong, our support team can help.
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/trainer/support">Contact support</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const [
    profile,
    activeAssignments,
    tasksDue,
    completedSubmissions,
    earnings,
    recentReviews,
    recommendedProjects,
    identityVerification,
  ] = await Promise.all([
    prisma.trainerProfile.findUnique({ where: { userId } }),
    prisma.projectAssignment.count({ where: { userId, status: "ACTIVE" } }),
    prisma.taskAssignment.findMany({
      where: { userId, completedAt: null },
      include: { task: { include: { project: true } } },
      orderBy: { dueAt: "asc" },
      take: 5,
    }),
    prisma.taskSubmission.findMany({ where: { submittedById: userId }, select: { submittedAt: true } }),
    prisma.earning.findMany({ where: { userId }, orderBy: { createdAt: "desc" }, take: 5 }),
    prisma.review.findMany({
      where: { submission: { submittedById: userId } },
      include: { reviewer: true, submission: { include: { task: { include: { project: true } } } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.project.findMany({
      where: { status: "ACTIVE", assignments: { none: { userId } } },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.identityVerification.findUnique({ where: { userId }, select: { status: true, expiresAt: true } }),
  ]);

  const identityExpiresAt = identityVerification?.status === "VERIFIED" ? identityVerification.expiresAt : null;
  const identityExpiry = credentialExpiryStatus(identityExpiresAt);

  const pendingCents = earnings
    .filter((e) => e.status === "PENDING_REVIEW" || e.status === "APPROVED")
    .reduce((sum, e) => sum + e.baseCents + e.bonusCents + e.adjustmentCents, 0);
  const weekCents = earnings.reduce((sum, e) => sum + e.baseCents + e.bonusCents + e.adjustmentCents, 0);

  const profileCompletion = profile ? Math.min(100, Math.round((profile.onboardingStep / 17) * 100)) : 0;
  const weeklySeries = buildWeeklySeries(
    completedSubmissions,
    recentReviews.map((r) => ({ createdAt: r.createdAt }))
  );

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Welcome back, ${session.user.name?.split(" ")[0] ?? "there"}`}
        description="Here's your work summary and next steps."
        actions={
          <Button variant="violet" asChild>
            <Link href="/trainer/projects">
              Browse projects <ArrowRight className="size-4" />
            </Link>
          </Button>
        }
      />

      {/* Reaching here means approved, so no gate banner or stepper: the
          approval journey is behind them and this page is about the work. */}
      {profileCompletion < 100 ? (
        <Card>
          <CardContent className="flex flex-col gap-3 pt-5 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex-1 space-y-2">
              <p className="text-sm font-medium">Your profile is {profileCompletion}% complete</p>
              <Progress value={profileCompletion} className="max-w-sm" />
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link href="/trainer/profile">Finish profile</Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {identityExpiry === "expired" || identityExpiry === "expiring_soon" ? (
        <Card className={identityExpiry === "expired" ? "border-destructive/40" : "border-warning/40"}>
          <CardContent className="flex flex-col gap-3 pt-5 pb-5 sm:flex-row sm:items-center sm:justify-between">
            <p className={`text-sm ${identityExpiry === "expired" ? "text-destructive" : "text-warning-foreground"}`}>
              {identityExpiry === "expired"
                ? "Your identity verification has expired. Re-verify to keep working on client tasks."
                : `Your identity verification expires in ${daysUntil(identityExpiresAt!)} days.`}
            </p>
            <Button variant="outline" size="sm" asChild>
              <Link href="/trainer/verification">
                {identityExpiry === "expired" ? "Re-verify now" : "View details"}
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Active projects" value={String(activeAssignments)} icon={Briefcase} />
        <KpiCard label="Tasks completed" value={String(completedSubmissions.length)} icon={CheckCircle2} />
        <KpiCard
          label="Pending earnings"
          value={formatCents(pendingCents)}
          icon={DollarSign}
          trend={pendingCents > 0 ? "up" : "flat"}
        />
        <KpiCard
          label="Quality score"
          value={profile?.qualityScore ? `${Math.round(profile.qualityScore * 100)}%` : "—"}
          icon={Gauge}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Weekly task progress</CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            <WeeklyTaskChart data={weeklySeries} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your active tasks</CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            {tasksDue.length === 0 ? (
              <EmptyState
                icon={Clock}
                title="No tasks due"
                description="Browse the marketplace to pick up new projects."
                action={
                  <Button size="sm" asChild>
                    <Link href="/trainer/projects">Browse projects</Link>
                  </Button>
                }
              />
            ) : (
              <ul className="divide-y divide-border">
                {tasksDue.map((a) => (
                  <li key={a.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.task.project.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Due {a.dueAt ? a.dueAt.toLocaleDateString() : "—"}
                      </p>
                    </div>
                    <StatusBadge status={a.task.status} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recommended projects</CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            {recommendedProjects.length === 0 ? (
              <EmptyState title="No new recommendations" description="Check back soon for newly opened projects." />
            ) : (
              <ul className="divide-y divide-border">
                {recommendedProjects.map((p) => (
                  <li key={p.id} className="flex items-center justify-between gap-3 py-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{p.name}</p>
                      <p className="text-xs text-muted-foreground">{p.domain}</p>
                    </div>
                    <Button size="sm" variant="outline" asChild>
                      <Link href={`/trainer/projects/${p.id}`}>Apply</Link>
                    </Button>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent feedback</CardTitle>
          </CardHeader>
          <CardContent className="pb-5">
            {recentReviews.length === 0 ? (
              <EmptyState
                icon={MessageSquareText}
                title="No feedback yet"
                description="Reviewer feedback on your submissions will appear here."
              />
            ) : (
              <ul className="space-y-3">
                {recentReviews.map((r) => (
                  <li key={r.id} className="flex items-start justify-between gap-3 text-sm">
                    <div className="min-w-0">
                      <p className="truncate font-medium">{r.submission.task.project.name}</p>
                      {r.feedback ? <p className="text-xs text-muted-foreground">{r.feedback}</p> : null}
                    </div>
                    <Badge variant={r.decision === "APPROVED" ? "success" : "warning"}>
                      {r.decision.replace(/_/g, " ").toLowerCase()}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <p className="text-xs text-muted-foreground">
        This week: <span className="font-medium text-foreground">{formatCents(weekCents)}</span> earned across{" "}
        {earnings.length} payout record{earnings.length === 1 ? "" : "s"}.{" "}
        <Link href="/trainer/earnings" className="text-primary hover:underline">
          View earnings
        </Link>
      </p>
    </div>
  );
}
