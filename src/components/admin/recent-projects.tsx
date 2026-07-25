import { CircleDot } from "lucide-react";

import { Panel } from "@/components/dashboard/panel";
import { Progress } from "@/components/ui/progress";
import type { Project } from "@/lib/types";
import { formatNumber } from "@/lib/utils";

export function RecentProjects({ projects }: { projects: Project[] }) {
  return (
    <Panel
      title="Recent Projects"
      footerLink={{ label: "View all projects", href: "/admin/projects" }}
    >
      <ul className="divide-y divide-border">
        {projects.map((project) => (
          <li key={project.id} className="py-4 first:pt-0">
            <div className="flex items-start gap-3">
              <CircleDot
                className="mt-0.5 h-4 w-4 shrink-0 text-primary"
                aria-hidden="true"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold">{project.name}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{project.client}</p>

                <div className="mt-2 flex items-center justify-between gap-4 text-xs">
                  <span className="font-semibold text-primary">{project.progress}%</span>
                  <span className="text-muted-foreground">
                    {formatNumber(project.completedTasks)} /{" "}
                    {formatNumber(project.totalTasks)}
                  </span>
                </div>

                <Progress
                  className="mt-2"
                  value={project.progress}
                  label={`${project.name} progress`}
                />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
