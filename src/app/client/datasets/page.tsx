import type { Metadata } from "next";
import { Database } from "lucide-react";

import { prisma } from "@/lib/db/prisma";
import { requireTenant } from "@/server/services/tenant";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { RequestExportForm } from "@/components/client/request-export-form";

export const metadata: Metadata = { title: "Datasets" };

export default async function DatasetsPage() {
  const tenant = await requireTenant();

  const datasets = await prisma.dataset.findMany({
    where: { organizationId: tenant.organizationId },
    include: { project: true, _count: { select: { items: true, exports: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Datasets" description="Accepted work, grouped and ready to export." />
      <Card>
        <CardContent className="pt-6 pb-6">
          {datasets.length === 0 ? (
            <EmptyState
              icon={Database}
              title="No datasets yet"
              description="Datasets are created as tasks pass review. Once a project starts delivering, they'll appear here."
            />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Dataset</TableHead><TableHead>Project</TableHead><TableHead>Items</TableHead>
                <TableHead>Exports</TableHead><TableHead>Created</TableHead><TableHead className="text-right">Export</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {datasets.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.name}</TableCell>
                    <TableCell className="max-w-52 truncate text-sm">{d.project.name}</TableCell>
                    <TableCell className="tabular-nums">{d._count.items}</TableCell>
                    <TableCell className="tabular-nums">{d._count.exports}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{d.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell className="text-right"><RequestExportForm datasetId={d.id} /></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
