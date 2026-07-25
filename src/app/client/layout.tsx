import Link from "next/link";
import { Building2 } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getTenant } from "@/server/services/tenant";
import { ClientShell } from "@/components/client/client-shell";
import { Button } from "@/components/ui/button";

export default async function ClientLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();
  const tenant = await getTenant();

  // Signed in with a client role but no organization yet — send them to
  // onboarding rather than rendering an empty portal.
  if (!tenant) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-surface px-4 text-center">
        <Building2 className="size-10 text-muted-foreground" />
        <div className="space-y-1.5">
          <h1 className="text-xl font-semibold">Set up your organization</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Your account isn&apos;t linked to an organization yet. Create one to start running
            projects.
          </p>
        </div>
        <Button asChild>
          <Link href="/client/onboarding">Get started</Link>
        </Button>
      </div>
    );
  }

  const [activeProjects, readyExports] = await Promise.all([
    prisma.project.count({ where: { organizationId: tenant.organizationId, status: "ACTIVE" } }),
    prisma.export.count({
      where: { status: "READY", dataset: { organizationId: tenant.organizationId } },
    }),
  ]);

  return (
    <ClientShell
      userName={session?.user?.name ?? "Client"}
      userEmail={session?.user?.email ?? ""}
      orgName={tenant.organizationName}
      activeProjects={activeProjects}
      readyExports={readyExports}
    >
      {children}
    </ClientShell>
  );
}
