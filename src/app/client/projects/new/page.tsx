import type { Metadata } from "next";

import { requireTenant } from "@/server/services/tenant";
import { PageHeader } from "@/components/shared/page-header";
import { ProjectWizard } from "@/components/client/project-wizard";

export const metadata: Metadata = { title: "Create project" };

export default async function NewProjectPage() {
  await requireTenant();
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageHeader
        title="Create a project"
        description="Define the work, the workforce, and the quality bar. You can save a draft at any point."
      />
      <ProjectWizard />
    </div>
  );
}
