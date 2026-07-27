import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { AssessmentRunner } from "@/components/trainer/assessment-runner";

export const metadata: Metadata = { title: "Assessment" };

export default async function AttemptPage({
  params,
}: {
  params: Promise<{ id: string; attemptId: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { attemptId } = await params;

  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: attemptId },
    include: { assessment: { include: { questions: { orderBy: { order: "asc" } } } } },
  });

  if (!attempt || attempt.userId !== session.user.id) notFound();
  if (attempt.status !== "IN_PROGRESS") redirect("/trainer/assessments");

  // Only the subset drawn for this attempt — the rest of the domain's bank
  // never crosses the server boundary. Correct answers are stripped too.
  const pool =
    attempt.selectedQuestionIds.length > 0
      ? attempt.assessment.questions.filter((q) => attempt.selectedQuestionIds.includes(q.id))
      : attempt.assessment.questions;

  const questions = pool.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    // Shuffled per attempt so option position can't be memorized — grading
    // compares the chosen value, not its position, so this is display-only.
    options: [...((q.options as string[] | null) ?? [])].sort(() => Math.random() - 0.5),
    points: q.points,
  }));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={attempt.assessment.title}
        description={`${questions.length} questions · pass mark ${Math.round(attempt.assessment.passThreshold * 100)}%`}
      />
      <AssessmentRunner
        attemptId={attempt.id}
        questions={questions}
        expiresAt={attempt.expiresAt?.toISOString() ?? null}
      />
    </div>
  );
}
