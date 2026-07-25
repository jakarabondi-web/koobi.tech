import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { CheckCircle2, AlertTriangle } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getTrainerGate } from "@/server/services/trainer-gate";
import { checkProjectEligibility } from "@/server/services/work-location";
import { PageHeader } from "@/components/shared/page-header";
import { GateBlocked } from "@/components/trainer/gate-banner";
import { ApplyButton } from "@/components/trainer/apply-button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Project details" };

function usd(cents: number | null) {
  return cents === null ? "—" : `$${(cents / 100).toFixed(2)}`;
}

export default async function ProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  const gate = await getTrainerGate(session.user.id);
  if (!gate.canAccessAssignments) {
    return (
      <div className="space-y-6">
        <PageHeader title="Project details" />
        <GateBlocked gate={gate} />
      </div>
    );
  }

  const [project, existingApplication, eligibility] = await Promise.all([
    prisma.project.findUnique({
      where: { id },
      include: { organization: true, qualifications: true, rubrics: true, _count: { select: { assignments: true } } },
    }),
    prisma.projectApplication.findUnique({
      where: { projectId_userId: { projectId: id, userId: session.user.id } },
    }),
    checkProjectEligibility({ userId: session.user.id, projectId: id }),
  ]);

  if (!project) notFound();

  return (
    <div className="space-y-6">
      <PageHeader title={project.name} description={project.organization.industry ?? "AI company"} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader><CardTitle className="text-base">Overview</CardTitle></CardHeader>
            <CardContent className="space-y-4 pb-6">
              <p className="text-sm text-muted-foreground">{project.description}</p>
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="secondary">{project.domain}</Badge>
                <Badge variant="outline">{project.taskType.replace(/_/g, " ").toLowerCase()}</Badge>
                {project.containsSensitiveContent ? (
                  <Badge variant="warning"><AlertTriangle className="size-3" /> Sensitive content</Badge>
                ) : null}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">Requirements</CardTitle></CardHeader>
            <CardContent className="pb-6">
              {project.qualifications.length === 0 ? (
                <p className="text-sm text-muted-foreground">
                  No additional qualifications beyond network approval.
                </p>
              ) : (
                <ul className="space-y-2">
                  {project.qualifications.map((q) => (
                    <li key={q.id} className="flex items-start gap-2 text-sm">
                      <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" />
                      <span>{q.description}{q.required ? "" : " (preferred)"}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle className="text-base">How you&apos;ll be paid</CardTitle></CardHeader>
            <CardContent className="space-y-2 pb-6 text-sm">
              <p>
                <span className="font-medium">{usd(project.payPerTaskCents)}</span> per accepted task,
                plus quality bonuses for consistently strong work.
              </p>
              <p className="text-muted-foreground">
                Earnings move to your wallet once a reviewer approves the task. You can request a
                payout any time your balance reaches the minimum.
              </p>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">At a glance</CardTitle></CardHeader>
            <CardContent className="space-y-3 pb-6 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Pay per task</span><span className="font-medium">{usd(project.payPerTaskCents)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Weekly load</span><span>~{project.estimatedHoursPerWeek ?? "—"} hrs</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Open positions</span><span>{Math.max(0, project.positionsAvailable - project._count.assignments)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Languages</span><span>{project.languages.map((l) => l.toUpperCase()).join(", ") || "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Starts</span><span>{project.startDate?.toLocaleDateString() ?? "—"}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Apply by</span><span>{project.applicationDeadline?.toLocaleDateString() ?? "—"}</span></div>
            </CardContent>
          </Card>

          {eligibility.eligible ? (
            <ApplyButton projectId={project.id} alreadyApplied={Boolean(existingApplication)} />
          ) : (
            <div className="rounded-lg border border-warning/50 bg-warning/10 p-4 text-sm">
              <p className="font-medium">Not available in your location</p>
              <ul className="mt-1.5 space-y-1 text-muted-foreground">
                {eligibility.reasons.map((r) => <li key={r}>{r}</li>)}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
