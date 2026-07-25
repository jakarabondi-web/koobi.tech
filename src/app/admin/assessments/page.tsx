import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { GraduationCap } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { GradeAttemptActions } from "@/components/admin/grade-attempt";

export const metadata: Metadata = { title: "Assessments" };

export default async function AdminAssessmentsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [assessments, needsReview, counts] = await Promise.all([
    prisma.assessment.findMany({
      include: { _count: { select: { questions: true, attempts: true } } },
      orderBy: { title: "asc" },
    }),
    prisma.assessmentAttempt.findMany({
      where: { status: "UNDER_REVIEW" },
      include: {
        user: true,
        assessment: true,
        responses: { include: { question: true } },
      },
      orderBy: { submittedAt: "asc" },
    }),
    prisma.assessmentAttempt.groupBy({ by: ["status"], _count: true }),
  ]);
  const countFor = (s: string) => counts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader title="Assessments" description="Qualification tests and attempts needing human grading." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Awaiting grading" value={String(needsReview.length)} icon={GraduationCap} />
        <KpiCard label="Passed" value={String(countFor("PASSED"))} />
        <KpiCard label="Failed" value={String(countFor("FAILED"))} />
        <KpiCard label="In progress" value={String(countFor("IN_PROGRESS"))} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Awaiting human grading</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {needsReview.length === 0 ? (
            <EmptyState icon={GraduationCap} title="Nothing to grade"
              description="Attempts with written answers appear here after the auto-graded portion passes." />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Candidate</TableHead><TableHead>Assessment</TableHead>
                <TableHead>Auto score</TableHead><TableHead>Submitted</TableHead>
                <TableHead className="text-right">Grade</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {needsReview.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell>{a.user.firstName} {a.user.lastName}</TableCell>
                    <TableCell>{a.assessment.title}</TableCell>
                    <TableCell className="tabular-nums">{a.score != null ? `${Math.round(a.score * 100)}%` : "—"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{a.submittedAt?.toLocaleDateString() ?? "—"}</TableCell>
                    <TableCell className="text-right">
                      <GradeAttemptActions
                        attemptId={a.id}
                        candidateName={`${a.user.firstName} ${a.user.lastName}`}
                        answers={a.responses
                          .filter((r) => r.question.type === "WRITTEN_RESPONSE")
                          .map((r) => ({ prompt: r.question.prompt, answer: String(r.answer ?? "") }))}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Assessment bank</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {assessments.length === 0 ? <EmptyState title="No assessments configured" /> : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Title</TableHead><TableHead>Domain</TableHead><TableHead>Questions</TableHead>
                <TableHead>Attempts</TableHead><TableHead>Pass mark</TableHead><TableHead>Active</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {assessments.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium">{a.title}</TableCell>
                    <TableCell className="text-sm">{a.domain}</TableCell>
                    <TableCell className="tabular-nums">{a._count.questions}</TableCell>
                    <TableCell className="tabular-nums">{a._count.attempts}</TableCell>
                    <TableCell className="tabular-nums">{Math.round(a.passThreshold * 100)}%</TableCell>
                    <TableCell>{a.isActive ? <Badge variant="success">Active</Badge> : <Badge variant="outline">Inactive</Badge>}</TableCell>
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
