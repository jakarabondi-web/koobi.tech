import type { Metadata } from "next";
import { Download } from "lucide-react";

import { prisma } from "@/lib/db/prisma";
import { requireTenant } from "@/server/services/tenant";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Exports" };

export default async function ExportsPage() {
  const tenant = await requireTenant();

  const exports = await prisma.export.findMany({
    where: { dataset: { organizationId: tenant.organizationId } },
    include: { dataset: { include: { project: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Exports" description="Download production-ready datasets." />

      <Card>
        <CardContent className="pt-6 pb-6">
          {exports.length === 0 ? (
            <EmptyState
              icon={Download}
              title="No exports requested"
              description="Request an export from the Datasets page."
            />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Dataset</TableHead><TableHead>Project</TableHead><TableHead>Format</TableHead>
                <TableHead>Requested</TableHead><TableHead>Status</TableHead><TableHead className="text-right">File</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {exports.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="font-medium">{e.dataset.name}</TableCell>
                    <TableCell className="max-w-48 truncate text-sm">{e.dataset.project.name}</TableCell>
                    <TableCell className="text-xs uppercase">{e.format}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{e.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell><StatusBadge status={e.status} /></TableCell>
                    <TableCell className="text-right">
                      {e.fileUrl ? (
                        <Button size="sm" variant="outline" asChild><a href={e.fileUrl}>Download</a></Button>
                      ) : (
                        <span className="text-xs text-muted-foreground">Not ready</span>
                      )}
                    </TableCell>
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
