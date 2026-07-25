import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getTrainerGate } from "@/server/services/trainer-gate";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Trainer detail" };
const usd = (c: number) => (c / 100).toLocaleString("en-US", { style: "currency", currency: "USD" });

export default async function TrainerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      trainerProfile: true,
      application: true,
      identityVerification: true,
      riskFlags: { orderBy: { createdAt: "desc" } },
      earnings: { orderBy: { createdAt: "desc" }, take: 10 },
      assessmentAttempts: { include: { assessment: true }, orderBy: { startedAt: "desc" } },
      locationSignals: { orderBy: { observedAt: "desc" }, take: 5 },
      roles: { include: { role: true } },
    },
  });
  if (!user) notFound();

  const gate = await getTrainerGate(id);
  const lifetime = user.earnings.reduce((s, e) => s + e.baseCents + e.bonusCents + e.adjustmentCents, 0);

  return (
    <div className="space-y-6">
      <Button variant="ghost" size="sm" asChild>
        <Link href="/admin/trainers"><ArrowLeft className="size-4" /> All trainers</Link>
      </Button>

      <PageHeader
        title={`${user.firstName} ${user.lastName}`}
        description={user.email}
        actions={<StatusBadge status={user.status} />}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Quality score" value={user.trainerProfile?.qualityScore ? `${Math.round(user.trainerProfile.qualityScore * 100)}%` : "—"} />
        <KpiCard label="Lifetime earnings" value={usd(lifetime)} />
        <KpiCard label="Open risk flags" value={String(user.riskFlags.filter((f) => f.status === "OPEN").length)} />
        <KpiCard label="Assessments" value={String(user.assessmentAttempts.length)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">Profile</CardTitle></CardHeader>
          <CardContent className="space-y-3 pb-6 text-sm">
            <div><span className="text-muted-foreground">Headline: </span>{user.trainerProfile?.headline ?? "—"}</div>
            <div><span className="text-muted-foreground">Country: </span>{user.trainerProfile?.country ?? "—"}</div>
            <div><span className="text-muted-foreground">Availability: </span>{user.trainerProfile?.availableHoursPerWeek ?? "—"} hrs/week</div>
            <div><span className="text-muted-foreground">Roles: </span>{user.roles.map((r) => r.role.key.replace(/_/g," ").toLowerCase()).join(", ")}</div>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">Access:</span>
              <Badge variant={gate.canAccessAssignments ? "success" : "warning"}>{gate.stage.replace(/_/g, " ")}</Badge>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Verification</CardTitle></CardHeader>
          <CardContent className="space-y-2 pb-6 text-sm">
            <div className="flex justify-between"><span className="text-muted-foreground">Application</span>{user.application ? <StatusBadge status={user.application.status} /> : "—"}</div>
            <div className="flex justify-between"><span className="text-muted-foreground">Identity</span>{user.identityVerification ? <StatusBadge status={user.identityVerification.status} /> : "—"}</div>
            <div className="flex justify-between"><span className="text-muted-foreground">Email</span>{user.emailVerifiedAt ? <Badge variant="success">Verified</Badge> : <Badge variant="warning">Unverified</Badge>}</div>
            <div className="flex justify-between"><span className="text-muted-foreground">Last seen</span><span className="text-xs">{user.locationSignals[0]?.countryCode ?? "—"}</span></div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Assessment history</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {user.assessmentAttempts.length === 0 ? <EmptyState title="No attempts" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Assessment</TableHead><TableHead>Score</TableHead><TableHead>Status</TableHead><TableHead>Submitted</TableHead></TableRow></TableHeader>
              <TableBody>
                {user.assessmentAttempts.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.assessment.title}</TableCell>
                    <TableCell className="tabular-nums">{a.score != null ? `${Math.round(a.score * 100)}%` : "—"}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.submittedAt?.toLocaleDateString() ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Risk flags</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {user.riskFlags.length === 0 ? <EmptyState title="No risk flags" description="Nothing has been flagged on this account." /> : (
            <Table>
              <TableHeader><TableRow><TableHead>Signal</TableHead><TableHead>Severity</TableHead><TableHead>Status</TableHead><TableHead>Raised</TableHead></TableRow></TableHeader>
              <TableBody>
                {user.riskFlags.map((f) => (
                  <TableRow key={f.id}>
                    <TableCell className="font-mono text-xs">{f.signal}</TableCell>
                    <TableCell><Badge variant={f.severity === "high" ? "destructive" : "warning"}>{f.severity}</Badge></TableCell>
                    <TableCell><StatusBadge status={f.status} /></TableCell>
                    <TableCell className="text-xs text-muted-foreground">{f.createdAt.toLocaleDateString()}</TableCell>
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
