"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { assertCan } from "@/lib/permissions/can";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

const schema = z.object({
  attemptId: z.string().uuid(),
  pass: z.enum(["true", "false"]),
  note: z.string().default(""),
});

/**
 * Human grading for attempts whose written answers can't be auto-scored.
 * Only reachable once the auto-graded portion has already passed.
 */
export async function gradeAttempt(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };
  assertCan(session.user.roles, "trainer.approve");

  const parsed = schema.safeParse({
    attemptId: formData.get("attemptId"),
    pass: formData.get("pass"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { status: "error", message: "Invalid grading input." };

  const attempt = await prisma.assessmentAttempt.findUnique({
    where: { id: parsed.data.attemptId },
    include: { user: true, assessment: true },
  });
  if (!attempt) return { status: "error", message: "Attempt not found." };
  if (attempt.status !== "UNDER_REVIEW") {
    return { status: "error", message: "This attempt isn't awaiting grading." };
  }

  const passed = parsed.data.pass === "true";

  await prisma.$transaction([
    prisma.assessmentAttempt.update({
      where: { id: attempt.id },
      data: { status: passed ? "PASSED" : "FAILED" },
    }),
    prisma.notification.create({
      data: {
        userId: attempt.userId,
        type: "assessment_graded",
        title: passed ? "Assessment passed" : "Assessment not passed",
        body: parsed.data.note || (passed
          ? "Your written answers were reviewed and accepted."
          : "Your written answers didn't meet the bar this time."),
        link: "/trainer/assessments",
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: passed ? "assessment.graded_pass" : "assessment.graded_fail",
        entityType: "AssessmentAttempt",
        entityId: attempt.id,
        metadata: { assessment: attempt.assessment.title },
      },
    }),
  ]);

  revalidatePath("/admin/assessments");
  return { status: "success", message: passed ? "Marked as passed." : "Marked as failed." };
}
