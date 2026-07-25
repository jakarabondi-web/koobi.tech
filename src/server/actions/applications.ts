"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import type { ApplicationStatus } from "@prisma/client";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { assertCan } from "@/lib/permissions/can";
import { sendEmail } from "@/lib/email/client";
import {
  applicationApprovedEmail,
  applicationMoreInfoEmail,
  applicationRejectedEmail,
  applicationSubmittedEmail,
  applicationWaitlistedEmail,
} from "@/emails/application";

export type ActionState = { status: "idle" | "success" | "error"; message?: string };

// --- Applicant: submit -----------------------------------------------------

const submitSchema = z.object({
  domain: z.string().min(1, "Choose your primary area of expertise"),
  headline: z.string().min(10, "Tell us a bit more about your background"),
  country: z.string().min(2, "Country is required"),
  hoursPerWeek: z.coerce.number().int().min(1).max(60),
});

export async function submitApplication(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };

  const parsed = submitSchema.safeParse({
    domain: formData.get("domain"),
    headline: formData.get("headline"),
    country: formData.get("country"),
    hoursPerWeek: formData.get("hoursPerWeek"),
  });
  if (!parsed.success) {
    return { status: "error", message: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const { domain, headline, country, hoursPerWeek } = parsed.data;

  await prisma.$transaction([
    prisma.application.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        domain,
        status: "SUBMITTED",
        submittedAt: new Date(),
      },
      update: { domain, status: "SUBMITTED", submittedAt: new Date(), reviewerMessage: null },
    }),
    prisma.trainerProfile.upsert({
      where: { userId: session.user.id },
      create: {
        userId: session.user.id,
        headline,
        country,
        availableHoursPerWeek: hoursPerWeek,
        onboardingStep: 6,
      },
      update: { headline, country, availableHoursPerWeek: hoursPerWeek, onboardingStep: 6 },
    }),
    prisma.notification.create({
      data: {
        userId: session.user.id,
        type: "application_submitted",
        title: "Application received",
        body: "Your application is under consideration. We'll email you once it's been reviewed.",
        link: "/trainer/dashboard",
      },
    }),
  ]);

  const mail = applicationSubmittedEmail(session.user.name?.split(" ")[0] ?? "there");
  await sendEmail({ to: session.user.email!, ...mail });

  revalidatePath("/trainer/dashboard");
  revalidatePath("/trainer/onboarding");
  return { status: "success", message: "Application submitted." };
}

// --- Reviewer: decide ------------------------------------------------------

const decisionSchema = z.object({
  applicationId: z.string().uuid(),
  decision: z.enum(["APPROVED", "REJECTED", "WAITLISTED", "ADDITIONAL_INFO_REQUIRED"]),
  message: z.string().default(""),
});

export async function decideApplication(_prev: ActionState, formData: FormData): Promise<ActionState> {
  const session = await auth();
  if (!session?.user) return { status: "error", message: "Not signed in." };
  assertCan(session.user.roles, "trainer.approve");

  const parsed = decisionSchema.safeParse({
    applicationId: formData.get("applicationId"),
    decision: formData.get("decision"),
    message: formData.get("message") ?? "",
  });
  if (!parsed.success) return { status: "error", message: "Invalid decision." };

  const { applicationId, decision, message } = parsed.data;

  // A decline or an info request must explain itself — the applicant sees this.
  if ((decision === "REJECTED" || decision === "ADDITIONAL_INFO_REQUIRED") && message.trim().length < 5) {
    return { status: "error", message: "Add a short message explaining the decision." };
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { user: true },
  });
  if (!application) return { status: "error", message: "Application not found." };

  await prisma.$transaction([
    prisma.application.update({
      where: { id: applicationId },
      data: {
        status: decision as ApplicationStatus,
        reviewerMessage: message || null,
        decidedAt: new Date(),
        decidedBy: session.user.id,
      },
    }),
    prisma.notification.create({
      data: {
        userId: application.userId,
        type: "application_decided",
        title:
          decision === "APPROVED"
            ? "Your application was approved"
            : decision === "ADDITIONAL_INFO_REQUIRED"
              ? "More information needed"
              : decision === "WAITLISTED"
                ? "You've been added to our waitlist"
                : "Application update",
        body: message || undefined,
        link: "/trainer/dashboard",
      },
    }),
    prisma.auditLog.create({
      data: {
        actorId: session.user.id,
        action: `application.${decision.toLowerCase()}`,
        entityType: "Application",
        entityId: applicationId,
        metadata: { decision },
      },
    }),
  ]);

  const firstName = application.user.firstName;
  const mail =
    decision === "APPROVED"
      ? applicationApprovedEmail(firstName)
      : decision === "ADDITIONAL_INFO_REQUIRED"
        ? applicationMoreInfoEmail(firstName, message)
        : decision === "WAITLISTED"
          ? applicationWaitlistedEmail(firstName, message)
          : applicationRejectedEmail(firstName, message);

  await sendEmail({ to: application.user.email, ...mail });

  revalidatePath("/admin/applications");
  return { status: "success", message: `Application ${decision.toLowerCase().replace(/_/g, " ")}.` };
}
