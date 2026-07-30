import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { requireApprovedTrainer } from "@/server/services/trainer-gate";
import { can } from "@/lib/permissions/can";
import { loadSubmissionForReview, ReviewError } from "@/server/services/reviews";
import { getOpenSimilarityFlag } from "@/server/services/plagiarism";
import { parseCustomSchema } from "@/lib/tasks/custom-schema";
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

  // CUSTOM submissions carry schema-defined responses instead of the
  // pairwise shape — resolve keys to labels via the project's template so
  // the reviewer sees the same field names the trainer did.
  let custom: ReviewSubmission["custom"];
  if (loaded.task.project.taskType === "CUSTOM") {
    const template = await prisma.taskTemplate.findFirst({
      where: { projectId: loaded.task.project.id },
      orderBy: { createdAt: "asc" },
    });
    const schema = template ? parseCustomSchema(template.schema) : null;
    if (schema) {
      const rawPayload = loaded.task.payload as Record<string, unknown>;
      const responses = (loaded.content as { responses?: Record<string, unknown> }).responses ?? {};
      const show = (v: unknown) =>
        v === undefined || v === null || v === ""
          ? "—"
          : typeof v === "object"
            ? JSON.stringify(v, null, 2)
            : String(v);
      custom = {
        inputs: schema.inputFields.map((f) => ({ label: f.label, value: show(rawPayload[f.key]) })),
        responses: schema.responseFields.map((f) => ({ label: f.label, value: show(responses[f.key]) })),
      };
    }
  }

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
    custom,
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
