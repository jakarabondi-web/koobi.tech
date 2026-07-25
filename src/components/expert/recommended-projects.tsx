import Link from "next/link";
import { Briefcase } from "lucide-react";

import { Panel } from "@/components/dashboard/panel";
import type { RecommendedProject } from "@/lib/types";

export function RecommendedProjects({
  projects,
}: {
  projects: RecommendedProject[];
}) {
  return (
    <Panel title="Recommended Projects">
      <ul className="divide-y divide-border">
        {projects.map((project) => (
          <li key={project.id} className="py-5 first:pt-0">
            <div className="flex items-start gap-3">
              <span
                className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border-2 border-primary text-primary"
                aria-hidden="true"
              >
                <Briefcase className="h-3.5 w-3.5" />
              </span>

              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold">{project.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{project.client}</p>

                <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
                  <span>{project.rate}</span>
                  <span>{project.commitment}</span>
                </div>

                <div className="mt-2 flex items-center justify-between gap-4">
                  <span className="text-xs text-muted-foreground">
                    {project.match}% match
                  </span>
                  <Link
                    href={`/dashboard/available/${project.id}`}
                    className="text-xs font-semibold text-primary hover:underline"
                  >
                    Apply
                    <span className="sr-only"> to {project.name}</span>
                  </Link>
                </div>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
