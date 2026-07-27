import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { ApplicationForm } from "@/components/trainer/application-form";
import { GateBanner } from "@/components/trainer/gate-banner";
import { OnboardingProgress } from "@/components/trainer/onboarding-progress";
import { getTrainerGate } from "@/server/services/trainer-gate";

export const metadata: Metadata = { title: "Application" };

export default async function OnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [application, profile, gate] = await Promise.all([
    prisma.application.findUnique({ where: { userId: session.user.id } }),
    prisma.trainerProfile.findUnique({ where: { userId: session.user.id } }),
    getTrainerGate(session.user.id),
  ]);

  const locked =
    application?.status === "SUBMITTED" ||
    application?.status === "UNDER_REVIEW" ||
    application?.status === "APPROVED";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Your application"
        description="Tell us about your expertise so we can match you to the right projects."
      />

      <OnboardingProgress gate={gate} />

      {/* When the next step *is* this page, the banner would sit directly
          above the form telling someone to go where they already are, with
          a button linking to itself. It still earns its place for the other
          stages, which explain why the form below is locked. */}
      {gate.actionHref === "/trainer/onboarding" ? null : <GateBanner gate={gate} />}

      {locked ? (
        <div className="rounded-xl border border-border bg-card p-6 text-sm text-muted-foreground">
          Your application has been submitted and can&apos;t be edited while it&apos;s under review.
          If you need to change something, contact support.
        </div>
      ) : (
        <ApplicationForm
          defaults={{
            domain: application?.domain ?? undefined,
            headline: profile?.headline ?? undefined,
            country: profile?.country ?? undefined,
            hoursPerWeek: profile?.availableHoursPerWeek ?? undefined,
          }}
        />
      )}
    </div>
  );
}
