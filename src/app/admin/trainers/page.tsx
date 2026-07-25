import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Users } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Trainers" };

export default async function AdminTrainersPage({
  searchParams,
}: { searchParams: Promise<{ q?: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { q } = await searchParams;

  const trainers = await prisma.trainerProfile.findMany({
    where: q
      ? { user: { OR: [
          { firstName: { contains: q, mode: "insensitive" } },
          { lastName: { contains: q, mode: "insensitive" } },
          { email: { contains: q, mode: "insensitive" } },
        ] } }
      : undefined,
    include: {
      user: {
        include: {
          application: true,
          identityVerification: true,
          riskFlags: { where: { status: "OPEN" } },
          _count: { select: { earnings: true } },
        },
      },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <PageHeader title="Trainers" description={`${trainers.length} trainer profiles.`} />

      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Search by name or email…"
          className="h-9 max-w-sm flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30" />
        <Button type="submit" variant="outline" size="sm">Search</Button>
      </form>

      <Card>
        <CardContent className="pt-6 pb-6">
          {trainers.length === 0 ? (
            <EmptyState icon={Users} title="No trainers found" />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Name</TableHead><TableHead>Country</TableHead><TableHead>Application</TableHead>
                <TableHead>Identity</TableHead><TableHead>Quality</TableHead><TableHead>Flags</TableHead><TableHead></TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {trainers.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell>
                      <p className="font-medium">{t.user.firstName} {t.user.lastName}</p>
                      <p className="text-xs text-muted-foreground">{t.user.email}</p>
                    </TableCell>
                    <TableCell className="text-sm">{t.country ?? "—"}</TableCell>
                    <TableCell>{t.user.application ? <StatusBadge status={t.user.application.status} /> : <Badge variant="outline">None</Badge>}</TableCell>
                    <TableCell>{t.user.identityVerification ? <StatusBadge status={t.user.identityVerification.status} /> : <Badge variant="outline">Not started</Badge>}</TableCell>
                    <TableCell className="tabular-nums">{t.qualityScore ? `${Math.round(t.qualityScore * 100)}%` : "—"}</TableCell>
                    <TableCell>{t.user.riskFlags.length ? <Badge variant="destructive">{t.user.riskFlags.length}</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="outline" asChild><Link href={`/admin/trainers/${t.user.id}`}>View</Link></Button>
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
