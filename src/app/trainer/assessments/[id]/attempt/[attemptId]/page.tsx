import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { ListChecks } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { shuffle } from "@/lib/utils/shuffle";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    options: shuffle((q.options as string[] | null) ?? []),
    points: q.points,
  }));

  const mcqCount = questions.filter((q) => q.type === "MULTIPLE_CHOICE").length;
  const writtenCount = questions.filter((q) => q.type === "WRITTEN_RESPONSE").length;
  const passMark = Math.round(attempt.assessment.passThreshold * 100);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title={attempt.assessment.title}
        description={`${questions.length} questions · pass mark ${passMark}%`}
      />

      {/*
        Same panel, same four facts, on every assessment regardless of
        domain — a candidate comparing scores across a review pipeline is
        only comparable to another candidate if both were told the same
        thing about how the test works before they started.
      */}
      <Card>
        <CardHeader className="flex-row items-center gap-2 space-y-0">
          <ListChecks className="size-4 text-muted-foreground" />
          <CardTitle className="text-sm">How this assessment works</CardTitle>
        </CardHeader>
        <CardContent className="pb-5">
          <ul className="list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">
            <li>
              {mcqCount} multiple-choice question{mcqCount === 1 ? "" : "s"} — graded the instant you
              submit. You need {passMark}% of these correct to pass this attempt.
            </li>
            {writtenCount > 0 ? (
              <li>
                {writtenCount} written-response question{writtenCount === 1 ? "" : "s"}
                {" — read and scored by a person, not auto-graded. Answer in complete sentences and "}
                explain your reasoning; a one-word or one-line answer won&apos;t give a reviewer enough
                to judge.
              </li>
            ) : null}
            <li>
              You have {attempt.assessment.timeLimitMins ?? "no"}
              {attempt.assessment.timeLimitMins ? " minutes" : " time limit"}, starting from when you
              began this attempt — the timer at the top counts down.
            </li>
            <li>
              Every question here is about judging an AI response, not about personally practicing the
              subject — you&apos;re being evaluated on evaluation skill.
            </li>
          </ul>
        </CardContent>
      </Card>

      <AssessmentRunner
        attemptId={attempt.id}
        questions={questions}
        expiresAt={attempt.expiresAt?.toISOString() ?? null}
      />
    </div>
  );
}
