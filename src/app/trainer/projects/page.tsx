import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Briefcase, MapPin, Clock, Users, AlertTriangle } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getTrainerGate } from "@/server/services/trainer-gate";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { GateBlocked } from "@/components/trainer/gate-banner";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Project marketplace" };

function usd(cents: number | null) {
  return cents === null ? "—" : `$${(cents / 100).toFixed(2)}`;
}

export default async function ProjectMarketplacePage({
  searchParams,
}: {
  searchParams: Promise<{ domain?: string; q?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const gate = await getTrainerGate(session.user.id);
  const { domain, q } = await searchParams;

  if (!gate.canAccessAssignments) {
    return (
      <div className="space-y-6">
        <PageHeader title="Project marketplace" description="Browse open projects and apply." />
        <GateBlocked gate={gate} />
      </div>
    );
  }

  const projects = await prisma.project.findMany({
    where: {
      status: "ACTIVE",
      ...(domain ? { domain } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    include: { organization: true, qualifications: true, _count: { select: { assignments: true } } },
    orderBy: { createdAt: "desc" },
  });

  const domains = [...new Set(projects.map((p) => p.domain))];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project marketplace"
        description={`${projects.length} project${projects.length === 1 ? "" : "s"} open to you right now.`}
      />

      <form className="flex flex-wrap gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search projects…"
          className="h-9 min-w-52 flex-1 rounded-md border border-input bg-background px-3 text-sm outline-none focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
        />
        <select
          name="domain"
          defaultValue={domain ?? ""}
          className="h-9 rounded-md border border-input bg-background px-3 text-sm outline-none"
        >
          <option value="">All domains</option>
          {domains.map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>
        <Button type="submit" variant="outline" size="sm">Filter</Button>
      </form>

      {projects.length === 0 ? (
        <EmptyState
          icon={Briefcase}
          title="No projects match your filters"
          description="Try clearing the filters, or check back soon — new projects open regularly."
        />
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => (
            <Card key={p.id}>
              <CardContent className="space-y-3 pt-5 pb-5">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="truncate text-sm font-semibold">{p.name}</h3>
                    <p className="text-xs text-muted-foreground">{p.organization.industry ?? "AI company"}</p>
                  </div>
                  {p.containsSensitiveContent ? (
                    <Badge variant="warning" className="shrink-0">
                      <AlertTriangle className="size-3" /> Sensitive
                    </Badge>
                  ) : null}
                </div>

                <p className="line-clamp-2 text-sm text-muted-foreground">{p.description}</p>

                <div className="flex flex-wrap gap-1.5">
                  <Badge variant="secondary">{p.domain}</Badge>
                  <Badge variant="outline">{p.taskType.replace(/_/g, " ").toLowerCase()}</Badge>
                  {p.languages.map((l) => (
                    <Badge key={l} variant="outline">{l.toUpperCase()}</Badge>
                  ))}
                </div>

                <dl className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <span className="font-medium text-foreground">{usd(p.payPerTaskCents)}</span> / task
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Clock className="size-3" /> ~{p.estimatedHoursPerWeek ?? "—"} hrs/week
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <Users className="size-3" /> {Math.max(0, p.positionsAvailable - p._count.assignments)} open
                  </div>
                  <div className="flex items-center gap-1.5 text-muted-foreground">
                    <MapPin className="size-3" /> Remote
                  </div>
                </dl>

                <Button size="sm" className="w-full" asChild>
                  <Link href={`/trainer/projects/${p.id}`}>View project</Link>
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
