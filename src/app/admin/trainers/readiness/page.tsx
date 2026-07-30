import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Medal, Users, TrendingUp } from "lucide-react";

import { auth } from "@/lib/auth";
import { getTrainerRankings, TIER_LABELS } from "@/server/services/readiness";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Trainer readiness rankings" };

export default async function ReadinessRankingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const rankings = await getTrainerRankings();
  const expertCount = rankings.filter((r) => r.tier === "EXPERT").length;
  const avg =
    rankings.length > 0
      ? Math.round((rankings.reduce((s, r) => s + r.overall, 0) / rankings.length) * 100)
      : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Readiness rankings"
        description="Every trainer with readiness results, ranked by overall skill score — use this to route specialist work to the strongest people."
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <KpiCard label="Ranked trainers" value={String(rankings.length)} icon={Users} />
        <KpiCard label="Expert tier" value={String(expertCount)} icon={Medal} />
        <KpiCard label="Average readiness" value={avg != null ? `${avg}%` : "—"} icon={TrendingUp} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Rankings</CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          {rankings.length === 0 ? (
            <EmptyState
              icon={Medal}
              title="No readiness results yet"
              description="Rankings appear once trainers complete readiness exams."
            />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Trainer</TableHead>
                  <TableHead>Domain</TableHead>
                  <TableHead>Tier</TableHead>
                  <TableHead>Overall</TableHead>
                  <TableHead>Percentile</TableHead>
                  <TableHead>Strongest skill</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rankings.map((r) => (
                  <TableRow key={r.userId}>
                    <TableCell className="tabular-nums">{r.rank}</TableCell>
                    <TableCell>
                      <Link href={`/admin/trainers/${r.userId}`} className="font-medium hover:underline">
                        {r.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">{r.email}</p>
                    </TableCell>
                    <TableCell className="text-sm">{r.domain ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant={r.tier === "EXPERT" || r.tier === "ADVANCED" ? "success" : "outline"}>
                        {TIER_LABELS[r.tier]}
                      </Badge>
                    </TableCell>
                    <TableCell className="tabular-nums">{Math.round(r.overall * 100)}%</TableCell>
                    <TableCell className="tabular-nums">P{r.percentile}</TableCell>
                    <TableCell className="text-sm">{r.topSkill ?? "—"}</TableCell>
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
