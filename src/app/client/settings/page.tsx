import type { Metadata } from "next";

import { prisma } from "@/lib/db/prisma";
import { requireTenant } from "@/server/services/tenant";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge-status";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Settings" };

export default async function ClientSettingsPage() {
  const tenant = await requireTenant();

  const org = await prisma.organization.findUniqueOrThrow({
    where: { id: tenant.organizationId },
    include: { clientProfile: true, _count: { select: { members: true, projects: true } } },
  });

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader title="Organization settings" description="Details for your account." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Organization</CardTitle>
          <CardDescription>Contact your operations manager to change these.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3 pb-6 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Name</span><span className="font-medium">{org.name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Industry</span><span>{org.industry ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Website</span><span>{org.website ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Primary contact</span><span>{org.clientProfile?.contactName ?? "—"}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Status</span><StatusBadge status={org.status} /></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Members</span><span className="tabular-nums">{org._count.members}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Projects</span><span className="tabular-nums">{org._count.projects}</span></div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your access</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3 pb-6 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Membership role</span>
            <Badge variant="secondary">{tenant.memberRole.replace(/_/g, " ").toLowerCase()}</Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {tenant.isOrgAdmin
              ? "You can create projects, invite teammates, and manage billing."
              : "You can view projects and results. Ask an admin for elevated access."}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
