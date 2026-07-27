import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Medal } from "lucide-react";

import { auth } from "@/lib/auth";
import { requireApprovedTrainer } from "@/server/services/trainer-gate";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { KpiCard } from "@/components/shared/kpi-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Gold tasks" };

export default async function GoldTasksPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  await requireApprovedTrainer(session.user.id);

  const results = await prisma.goldTaskResult.findMany({
    where: { userId: session.user.id },
    orderBy: { evaluatedAt: "desc" },
    take: 50,
  });

  const passed = results.filter((r) => r.passed).length;
  const rate = results.length ? Math.round((passed / results.length) * 100) : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Gold task performance"
        description="Benchmark tasks with known answers, mixed invisibly into your queue to calibrate quality."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Gold tasks completed" value={String(results.length)} icon={Medal} />
        <KpiCard label="Pass rate" value={rate === null ? "—" : `${rate}%`} trend={rate && rate >= 85 ? "up" : "flat"} />
        <KpiCard label="Passed" value={`${passed} / ${results.length}`} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent results</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {results.length === 0 ? (
            <EmptyState
              icon={Medal}
              title="No gold tasks yet"
              description="These are seeded into your normal queue — you won't know which ones they are. Results appear here afterwards."
            />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Date</TableHead><TableHead>Score</TableHead><TableHead>Result</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {results.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="text-xs text-muted-foreground">{r.evaluatedAt.toLocaleDateString()}</TableCell>
                    <TableCell className="tabular-nums">{r.score === null ? "—" : `${Math.round(r.score * 100)}%`}</TableCell>
                    <TableCell><Badge variant={r.passed ? "success" : "destructive"}>{r.passed ? "Passed" : "Missed"}</Badge></TableCell>
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
