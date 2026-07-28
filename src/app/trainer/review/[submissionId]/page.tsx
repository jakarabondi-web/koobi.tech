import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { requireApprovedTrainer } from "@/server/services/trainer-gate";
import { can } from "@/lib/permissions/can";
import { loadSubmissionForReview, ReviewError } from "@/server/services/reviews";
import { getOpenSimilarityFlag } from "@/server/services/plagiarism";
import { PageHeader } from "@/components/shared/page-header";
import { Button } from "@/components/ui/button";
import { ReviewWorkspace, type ReviewSubmission } from "@/components/tasks/review-workspace";

export const metadata: Metadata = { title: "Review submission" };

export default async function ReviewSubmissionPage({
  params,
}: { params: Promise<{ submissionId: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  await requireApprovedTrainer(session.user.id);
  if (!can(session.user.roles, "task.review")) redirect("/trainer/review");

  const { submissionId } = await params;

  let loaded;
  try {
    loaded = await loadSubmissionForReview(submissionId, session.user.id);
  } catch (err) {
    if (err instanceof ReviewError) notFound();
    throw err;
  }

  const similarityFlag = await getOpenSimilarityFlag(submissionId);

  const payload = loaded.task.payload as {
    prompt?: string; responseA?: string; responseB?: string;
  };
  const content = loaded.content as {
    preferred?: string; confidence?: number; justification?: string;
    flags?: Record<string, boolean>;
  };

  const submission: ReviewSubmission = {
    id: loaded.id,
    version: loaded.version,
    durationSeconds: loaded.durationSeconds,
    submittedAt: loaded.submittedAt.toISOString(),
    prompt: payload.prompt ?? "",
    responseA: payload.responseA ?? "",
    responseB: payload.responseB ?? "",
    preferred: content.preferred,
    confidence: content.confidence,
    justification: content.justification,
    flags: content.flags,
    goldAnswer: loaded.goldAnswer ? String(loaded.goldAnswer) : null,
    similarityFlag,
  };

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/trainer/review"><ArrowLeft className="size-4" /> Review queue</Link>
      </Button>
      <PageHeader
        title={loaded.task.project.name}
        description={`Submission ${loaded.id.slice(0, 8)} · ${loaded.task.project.taskType.replace(/_/g, " ").toLowerCase()}`}
      />
      <ReviewWorkspace submission={submission} />
    </div>
  );
}
