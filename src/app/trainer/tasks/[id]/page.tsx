import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, BookOpen } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getTrainerGate } from "@/server/services/trainer-gate";
import { PageHeader } from "@/components/shared/page-header";
import { GateBlocked } from "@/components/trainer/gate-banner";
import { PairwiseWorkspace, type PairwisePayload } from "@/components/tasks/pairwise-workspace";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/ui/badge-status";

export const metadata: Metadata = { title: "Task workspace" };

export default async function TaskWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  const gate = await getTrainerGate(session.user.id);
  if (!gate.canAccessAssignments) {
    return (
      <div className="space-y-6">
        <PageHeader title="Task workspace" />
        <GateBlocked gate={gate} />
      </div>
    );
  }

  const assignment = await prisma.taskAssignment.findUnique({
    where: { taskId_userId: { taskId: id, userId: session.user.id } },
    include: {
      task: {
        include: {
          project: { include: { rubrics: true } },
          submissions: { where: { submittedById: session.user.id }, orderBy: { version: "desc" }, take: 1 },
        },
      },
    },
  });

  if (!assignment) notFound();

  const { task } = assignment;
  const payload = task.payload as unknown as PairwisePayload;
  const latest = task.submissions[0];
  const readOnly = Boolean(assignment.completedAt);

  const existing = latest
    ? (latest.content as { preferred?: string; confidence?: number; justification?: string })
    : undefined;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/trainer/tasks"><ArrowLeft className="size-4" /> All tasks</Link>
        </Button>
        <StatusBadge status={task.status} />
      </div>

      <PageHeader
        title={task.project.name}
        description={`Task ${task.id.slice(0, 8)} · ${task.project.taskType.replace(/_/g, " ").toLowerCase()}`}
      />

      <div className="rounded-xl border border-border bg-surface p-4">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          <BookOpen className="size-4 text-primary" /> Instructions
        </p>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Read the prompt, then choose the response that better serves the user. Judge on accuracy and
          usefulness — not length or confidence of tone. Explain your reasoning specifically, and flag
          anything unsafe or factually wrong.
        </p>
      </div>

      <PairwiseWorkspace taskId={task.id} payload={payload} readOnly={readOnly} existing={existing} />
    </div>
  );
}
