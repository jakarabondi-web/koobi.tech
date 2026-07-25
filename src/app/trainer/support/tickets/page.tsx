import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { MessageCircleQuestion } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "My tickets" };

export default async function TicketsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const tickets = await prisma.supportTicket.findMany({
    where: { requesterId: session.user.id },
    include: { messages: { orderBy: { createdAt: "asc" }, take: 1 } },
    orderBy: { updatedAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="My tickets"
        description="Support requests you've opened."
        actions={<Button variant="violet" asChild><Link href="/trainer/support">New ticket</Link></Button>}
      />
      <Card>
        <CardContent className="pt-6 pb-6">
          {tickets.length === 0 ? (
            <EmptyState
              icon={MessageCircleQuestion}
              title="No tickets yet"
              description="If something goes wrong, open a ticket and we'll help."
              action={<Button size="sm" asChild><Link href="/trainer/support">Open a ticket</Link></Button>}
            />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Subject</TableHead><TableHead>Category</TableHead>
                <TableHead>Opened</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {tickets.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <p className="font-medium">{t.subject}</p>
                      <p className="max-w-md truncate text-xs text-muted-foreground">{t.messages[0]?.body}</p>
                    </TableCell>
                    <TableCell className="text-xs">{t.category.replace(/_/g, " ").toLowerCase()}</TableCell>
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
