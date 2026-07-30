import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { prisma } from "@/lib/db/prisma";
import { loadClientProject } from "@/server/services/client-project";
import { requiredFieldsFor, sampleFor } from "@/lib/tasks/import-parser";
import { customRequiredFields, parseCustomSchema } from "@/lib/tasks/custom-schema";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TaskImporter } from "@/components/client/task-importer";

export const metadata: Metadata = { title: "Import tasks" };

export default async function ImportTasksPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { project } = await loadClientProject(id);

  // A CUSTOM project's required fields come from its template, not the
  // static per-type table the importer uses for built-in types.
  let customFields: string[] | undefined;
  if (project.taskType === "CUSTOM") {
    const template = await prisma.taskTemplate.findFirst({
      where: { projectId: project.id },
      orderBy: { createdAt: "asc" },
    });
    const schema = template ? parseCustomSchema(template.schema) : null;
    customFields = schema ? customRequiredFields(schema) : undefined;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href={`/client/projects/${id}`}><ArrowLeft className="size-4" /> Back to project</Link>
      </Button>

      <PageHeader
        title="Import tasks"
        description={`Add work to ${project.name}. Upload a file or paste rows directly.`}
      />

      <Card>
        <CardContent className="pt-6 pb-6">
          <TaskImporter
            projectId={project.id}
            taskType={project.taskType}
            requiredFields={requiredFieldsFor(project.taskType, customFields)}
            sampleJsonl={sampleFor(project.taskType, "jsonl", customFields)}
            sampleCsv={sampleFor(project.taskType, "csv", customFields)}
          />
        </CardContent>
      </Card>
    </div>
  );
}
