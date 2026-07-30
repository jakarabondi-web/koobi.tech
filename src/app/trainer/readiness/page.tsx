import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { CheckCircle2, Sparkles } from "lucide-react";

import { auth } from "@/lib/auth";
import { getTrainerGate } from "@/server/services/trainer-gate";
import { listReadinessTasksForUser } from "@/server/services/readiness";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const metadata: Metadata = { title: "Readiness program" };

export default async function ReadinessPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const gate = await getTrainerGate(session.user.id);

  // Reachable once approved (to work through it) or after (to review past
  // results) — everyone earlier in the funnel has nothing to see here yet.
  const reachable = gate.stage === "readiness_required" || gate.stage === "approved";
  if (!reachable) {
    return (
      <div className="space-y-6">
        <PageHeader title="Readiness program" />
        <EmptyState
          icon={Sparkles}
          title="Not available yet"
          description="The readiness program unlocks once your application is approved."
        />
      </div>
    );
  }

  const tasks = await listReadinessTasksForUser(session.user.id);
  const completed = tasks.filter((t) => t.completed).length;
  const bySkill = new Map<string, typeof tasks>();
  for (const t of tasks) bySkill.set(t.skill, [...(bySkill.get(t.skill) ?? []), t]);

  const firstIncomplete = tasks.find((t) => !t.completed);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Readiness program"
        description="A short set of calibration tasks: pick the better response, then see the right answer and why — this is what builds your skill profile."
      />

      {tasks.length === 0 ? (
        <EmptyState icon={Sparkles} title="No readiness content yet" description="Check back shortly." />
      ) : (
        <>
          <div className="rounded-xl border border-border bg-surface p-4 text-sm">
            <span className="font-medium">{completed}</span> / {tasks.length} tasks completed
            {completed >= tasks.length ? (
              <span className="ml-2 inline-flex items-center gap-1 text-success">
                <CheckCircle2 className="size-4" /> Program complete
              </span>
            ) : null}
          </div>

          {firstIncomplete ? (
            <Button variant="violet" asChild>
              <Link href={`/trainer/readiness/${firstIncomplete.id}`}>Continue</Link>
            </Button>
          ) : null}

          {[...bySkill.entries()].map(([skill, skillTasks]) => (
            <div key={skill} className="space-y-3">
              <h2 className="text-sm font-semibold">{skill}</h2>
              <div className="grid gap-3 md:grid-cols-3">
                {skillTasks.map((t) => (
                  <Card key={t.id}>
                    <CardContent className="space-y-2 pt-5 pb-5">
                      <div className="flex items-center justify-between gap-2">
                        <p className="text-sm font-medium">{t.title}</p>
                        {t.completed ? (
                          <Badge variant={t.result?.correct ? "success" : "outline"}>
                            {t.result?.correct ? "Correct" : "Reviewed"}
                          </Badge>
                        ) : null}
                      </div>
                      <Button variant={t.completed ? "outline" : "violet"} size="sm" asChild>
                        <Link href={`/trainer/readiness/${t.id}`}>{t.completed ? "Review" : "Start"}</Link>
                      </Button>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );
}
