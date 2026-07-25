import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { can } from "@/lib/permissions/can";
import { requiredFieldsFor, sampleFor } from "@/lib/tasks/import-parser";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskImporter } from "@/components/client/task-importer";

export const metadata: Metadata = { title: "Import tasks" };

/**
 * Operations-side import. Same importer component as the client portal —
 * the server action authorizes by tenant membership, so an operations
 * manager importing on a client's behalf still needs org membership.
 */
export default async function AdminImportPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (!can(session.user.roles, "project.edit")) redirect("/admin/projects");

  const { id } = await params;
  const project = await prisma.project.findUnique({
    where: { id },
    include: { organization: true },
  });
  if (!project) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/projects"><ArrowLeft className="size-4" /> All projects</Link>
      </Button>

      <PageHeader
        title="Import tasks"
        description={`${project.name} · ${project.organization.name}`}
      />

      <Card>
        <CardContent className="pt-6 pb-6">
          <TaskImporter
            projectId={project.id}
            taskType={project.taskType}
            requiredFields={requiredFieldsFor(project.taskType)}
            sampleJsonl={sampleFor(project.taskType, "jsonl")}
            sampleCsv={sampleFor(project.taskType, "csv")}
          />
        </CardContent>
      </Card>
    </div>
  );
}
