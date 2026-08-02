import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { NotificationPreferences, SensitiveContentToggle } from "@/components/trainer/settings-forms";
import { TwoFactorSettings } from "@/components/shared/two-factor-settings";
import { SessionsPanel } from "@/components/shared/sessions-panel";
import { AccountInfoForm } from "@/components/shared/account-info-form";
import { ChangePasswordForm } from "@/components/shared/change-password-form";
import { recentLoginSummaries } from "@/server/services/login-events";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user, profile, recentLogins] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.trainerProfile.findUnique({ where: { userId: session.user.id } }),
    recentLoginSummaries(session.user.id),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Account, notifications, and work preferences." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Your name and login email.</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <AccountInfoForm
            firstName={user?.firstName ?? ""}
            lastName={user?.lastName ?? ""}
            displayName={user?.displayName ?? null}
            email={user?.email ?? ""}
            emailVerified={Boolean(user?.emailVerifiedAt)}
            pendingEmail={user?.pendingEmail ?? null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Password</CardTitle>
          <CardDescription>Change your password.</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <ChangePasswordForm />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Two-factor authentication</CardTitle>
          <CardDescription>Require a code from your phone to sign in.</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <TwoFactorSettings
            initiallyEnabled={user?.twoFactorEnabled ?? false}
            recoveryCodesRemaining={user?.twoFactorRecoveryCodes.length ?? 0}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Sessions</CardTitle>
          <CardDescription>Where you&apos;re currently signed in.</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <SessionsPanel recentLogins={recentLogins} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Work preferences</CardTitle>
          <CardDescription>Control what kind of tasks you can be matched to.</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <SensitiveContentToggle initial={profile?.sensitiveContentOptIn ?? false} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Notifications</CardTitle>
          <CardDescription>Choose what we email you about.</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <NotificationPreferences />
        </CardContent>
      </Card>
    </div>
  );
}
