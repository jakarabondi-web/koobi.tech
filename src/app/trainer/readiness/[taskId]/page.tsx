import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { listReadinessTasksForUser } from "@/server/services/readiness";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ReadinessWorkspace } from "@/components/trainer/readiness-workspace";

export const metadata: Metadata = { title: "Readiness task" };

export default async function ReadinessTaskPage({ params }: { params: Promise<{ taskId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { taskId } = await params;

  const tasks = await listReadinessTasksForUser(session.user.id);
  const task = tasks.find((t) => t.id === taskId);
  if (!task) notFound();

  const nextTask = tasks.find((t) => !t.completed && t.id !== taskId);

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" asChild>
          <Link href="/trainer/readiness"><ArrowLeft className="size-4" /> Readiness program</Link>
        </Button>
      </div>

      <PageHeader title={task.title} description={`Skill: ${task.skill}`} />

      <ReadinessWorkspace
        taskId={task.id}
        skill={task.skill}
        prompt={task.prompt}
        responseA={task.responseA}
        responseB={task.responseB}
        existing={task.result}
        nextTaskId={nextTask?.id}
      />
    </div>
  );
}
