import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Building2 } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";

export const metadata: Metadata = { title: "Clients" };

export default async function ClientsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const orgs = await prisma.organization.findMany({
    include: { clientProfile: true, _count: { select: { projects: true, members: true } } },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Client organizations" description={`${orgs.length} organizations on the platform.`} />
      <Card>
        <CardContent className="pt-6 pb-6">
          {orgs.length === 0 ? <EmptyState icon={Building2} title="No client organizations yet" /> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Organization</TableHead><TableHead>Industry</TableHead><TableHead>Projects</TableHead>
                <TableHead>Members</TableHead><TableHead>Status</TableHead><TableHead>Joined</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {orgs.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell>
                      <p className="font-medium">{o.name}</p>
                      <p className="text-xs text-muted-foreground">{o.clientProfile?.contactName ?? "—"}</p>
                    </TableCell>
                    <TableCell className="text-sm">{o.industry ?? "—"}</TableCell>
                    <TableCell className="tabular-nums">{o._count.projects}</TableCell>
                    <TableCell className="tabular-nums">{o._count.members}</TableCell>
                    <TableCell><StatusBadge status={o.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{o.createdAt.toLocaleDateString()}</TableCell>
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
