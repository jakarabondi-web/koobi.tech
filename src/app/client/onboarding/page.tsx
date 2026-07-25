import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";

import { auth } from "@/lib/auth";
import { getTenant } from "@/server/services/tenant";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { OrganizationSetupForm } from "@/components/client/organization-setup-form";

export const metadata: Metadata = { title: "Set up your organization" };

export default async function ClientOnboardingPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tenant = await getTenant();
  if (tenant) redirect("/client/dashboard");

  return (
    <div className="mx-auto max-w-xl space-y-6 py-8">
      <PageHeader
        title="Set up your organization"
        description="This is the workspace your projects, datasets, and team live in."
      />
      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="mb-5 flex items-center gap-3 rounded-lg bg-muted/50 p-3">
            <Building2 className="size-5 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Your organization&apos;s data is isolated from every other client on the platform.
            </p>
          </div>
          <OrganizationSetupForm />
        </CardContent>
      </Card>
    </div>
  );
}
