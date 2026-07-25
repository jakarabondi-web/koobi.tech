import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { UserPlus, CheckCircle2 } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { can } from "@/lib/permissions/can";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";
import { Badge } from "@/components/ui/badge";
import { ApplicationReviewActions } from "@/components/admin/application-review";

export const metadata: Metadata = { title: "Trainer applications" };

export default async function ApplicationsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const canApprove = can(session.user.roles, "trainer.approve");

  const [pending, decided, counts] = await Promise.all([
    prisma.application.findMany({
      where: { status: { in: ["SUBMITTED", "UNDER_REVIEW", "ADDITIONAL_INFO_REQUIRED"] } },
      include: {
        user: {
          include: {
            trainerProfile: true,
            identityVerification: true,
            assessmentAttempts: { where: { status: "PASSED" }, take: 1 },
          },
        },
      },
      orderBy: { submittedAt: "asc" },
    }),
    prisma.application.findMany({
      where: { status: { in: ["APPROVED", "REJECTED", "WAITLISTED"] } },
      include: { user: true },
      orderBy: { decidedAt: "desc" },
      take: 15,
    }),
    prisma.application.groupBy({ by: ["status"], _count: true }),
  ]);

  const countFor = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Trainer applications"
        description="Review applicants and decide who joins the network. Every decision emails the applicant."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Awaiting review" value={String(pending.length)} icon={UserPlus} />
        <KpiCard label="Approved" value={String(countFor("APPROVED"))} icon={CheckCircle2} />
        <KpiCard label="Waitlisted" value={String(countFor("WAITLISTED"))} />
        <KpiCard label="Declined" value={String(countFor("REJECTED"))} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Awaiting review</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {pending.length === 0 ? (
            <EmptyState icon={CheckCircle2} title="Nothing waiting" description="New applications appear here." />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Applicant</TableHead><TableHead>Domain</TableHead>
                <TableHead>Readiness</TableHead><TableHead>Submitted</TableHead>
                <TableHead>Status</TableHead><TableHead className="text-right">Decision</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {pending.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>
                      <p className="font-medium">{a.user.firstName} {a.user.lastName}</p>
                      <p className="text-xs text-muted-foreground">{a.user.email}</p>
                      {a.user.trainerProfile?.headline ? (
                        <p className="mt-0.5 max-w-sm truncate text-xs text-muted-foreground">
                          {a.user.trainerProfile.headline}
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell className="text-sm">{a.domain ?? "—"}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Badge variant={a.user.assessmentAttempts.length ? "success" : "outline"}>
                          {a.user.assessmentAttempts.length ? "Assessment passed" : "No assessment"}
                        </Badge>
                        <Badge variant={a.user.identityVerification?.status === "VERIFIED" ? "success" : "outline"}>
                          {a.user.identityVerification?.status === "VERIFIED" ? "ID verified" : "ID pending"}
                        </Badge>
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {a.submittedAt?.toLocaleDateString() ?? "—"}
                    </TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
                    <TableCell className="text-right">
                      {canApprove ? (
                        <ApplicationReviewActions
                          applicationId={a.id}
                          applicantName={`${a.user.firstName} ${a.user.lastName}`}
                        />
                      ) : (
                        <span className="text-xs text-muted-foreground">View only</span>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recently decided</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {decided.length === 0 ? (
            <EmptyState title="No decisions yet" />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Applicant</TableHead><TableHead>Decided</TableHead><TableHead>Outcome</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {decided.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.user.firstName} {a.user.lastName}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.decidedAt?.toLocaleDateString() ?? "—"}</TableCell>
                    <TableCell><StatusBadge status={a.status} /></TableCell>
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
