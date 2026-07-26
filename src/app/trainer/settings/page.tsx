import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { NotificationPreferences, SensitiveContentToggle } from "@/components/trainer/settings-forms";
import { TwoFactorSettings } from "@/components/shared/two-factor-settings";

export const metadata: Metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [user, profile] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.trainerProfile.findUnique({ where: { userId: session.user.id } }),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Settings" description="Account, notifications, and work preferences." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Account</CardTitle>
          <CardDescription>Sign-in details and security.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pb-6 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span className="flex items-center gap-2">
              {user?.email}
              {user?.emailVerifiedAt ? <Badge variant="success">Verified</Badge> : <Badge variant="warning">Unverified</Badge>}
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Two-factor authentication</CardTitle>
          <CardDescription>Require a code from your phone to sign in.</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <TwoFactorSettings initiallyEnabled={user?.twoFactorEnabled ?? false} />
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
