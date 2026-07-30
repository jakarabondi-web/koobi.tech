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
import { CustomWorkspace } from "@/components/tasks/custom-workspace";
import { parseCustomSchema } from "@/lib/tasks/custom-schema";
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
  const latest = task.submissions[0];
  const readOnly = Boolean(assignment.completedAt);
  const isCustom = task.project.taskType === "CUSTOM";

  // A CUSTOM project's workspace is defined by its template: which payload
  // fields to show, which responses to collect, and the instructions text.
  const customSchema = isCustom
    ? parseCustomSchema(
        (
          await prisma.taskTemplate.findFirst({
            where: { projectId: task.projectId },
            orderBy: { createdAt: "asc" },
          })
        )?.schema
      )
    : null;

  const instructions = customSchema
    ? customSchema.instructions
    : "Read the prompt, then choose the response that better serves the user. Judge on accuracy and usefulness — not length or confidence of tone. Explain your reasoning specifically, and flag anything unsafe or factually wrong.";

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
        <p className="mt-1.5 whitespace-pre-wrap text-sm text-muted-foreground">{instructions}</p>
      </div>

      {customSchema ? (
        <CustomWorkspace
          taskId={task.id}
          schema={customSchema}
          payload={task.payload as Record<string, unknown>}
          readOnly={readOnly}
          existing={
            latest ? (latest.content as { responses?: Record<string, unknown> }).responses : undefined
          }
        />
      ) : isCustom ? (
        <p className="rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm text-warning-foreground">
          This project&apos;s task schema is missing or invalid — contact support before working on it.
        </p>
      ) : (
        <PairwiseWorkspace
          taskId={task.id}
          payload={task.payload as unknown as PairwisePayload}
          readOnly={readOnly}
          existing={
            latest
              ? (latest.content as { preferred?: string; confidence?: number; justification?: string })
              : undefined
          }
        />
      )}
    </div>
  );
}
