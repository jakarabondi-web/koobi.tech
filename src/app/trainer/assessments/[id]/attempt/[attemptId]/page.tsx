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

  // Correct answers are stripped before anything reaches the client — the
  // full question rows never cross the server boundary.
  const questions = attempt.assessment.questions.map((q) => ({
    id: q.id,
    type: q.type,
    prompt: q.prompt,
    options: (q.options as string[] | null) ?? [],
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
