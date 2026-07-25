import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LifeBuoy } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";

export const metadata: Metadata = { title: "Support" };

export default async function AdminSupportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [tickets, counts] = await Promise.all([
    prisma.supportTicket.findMany({
      include: { requester: true, assignee: true, messages: { take: 1, orderBy: { createdAt: "asc" } } },
      orderBy: { updatedAt: "desc" },
      take: 100,
    }),
    prisma.supportTicket.groupBy({ by: ["status"], _count: true }),
  ]);
  const countFor = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Support tickets" description="Requests from trainers and clients." />
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Open" value={String(countFor("OPEN"))} icon={LifeBuoy} />
        <KpiCard label="Assigned" value={String(countFor("ASSIGNED"))} />
        <KpiCard label="Escalated" value={String(countFor("ESCALATED"))} trend={countFor("ESCALATED") > 0 ? "down" : "flat"} />
        <KpiCard label="Resolved" value={String(countFor("RESOLVED") + countFor("CLOSED"))} />
      </div>
      <Card>
        <CardContent className="pt-6 pb-6">
          {tickets.length === 0 ? <EmptyState icon={LifeBuoy} title="No tickets" description="Support requests appear here." /> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Subject</TableHead><TableHead>Requester</TableHead><TableHead>Category</TableHead>
                <TableHead>Assignee</TableHead><TableHead>Opened</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <p className="font-medium">{t.subject}</p>
                      <p className="max-w-sm truncate text-xs text-muted-foreground">{t.messages[0]?.body}</p>
                    </TableCell>
                    <TableCell className="text-sm">{t.requester.firstName} {t.requester.lastName}</TableCell>
                    <TableCell className="text-xs">{t.category.replace(/_/g, " ").toLowerCase()}</TableCell>
                    <TableCell className="text-sm">{t.assignee ? `${t.assignee.firstName} ${t.assignee.lastName}` : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{t.createdAt.toLocaleDateString()}</TableCell>
                    <TableCell><StatusBadge status={t.status} /></TableCell>
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
