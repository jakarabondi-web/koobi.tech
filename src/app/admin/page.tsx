import { ChevronDown } from "lucide-react";

import { PendingItems } from "@/components/admin/pending-items";
import { RecentProjects } from "@/components/admin/recent-projects";
import { SystemAlerts } from "@/components/admin/system-alerts";
import { TopTrainers } from "@/components/admin/top-trainers";
import { QualityScoreTrend } from "@/components/charts/quality-score-trend";
import { TaskCompletionTrend } from "@/components/charts/task-completion-trend";
import { TasksByStatus } from "@/components/charts/tasks-by-status";
import { Panel, RangeChip } from "@/components/dashboard/panel";
import { StatCardGrid } from "@/components/dashboard/stat-card";
import {
  adminDateRange,
  adminMetrics,
  adminUser,
  pendingItems,
  qualityScoreTrend,
  recentProjects,
  systemAlerts,
  taskCompletionTrend,
  tasksByStatus,
  tasksByStatusTotal,
  topTrainers,
} from "@/lib/mock-data";

export default function AdminOverviewPage() {
  const firstName = adminUser.name.split(" ")[0];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Admin Overview</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Welcome back, {firstName}. Here&apos;s what&apos;s happening on Trainora AI
            today.
          </p>
        </div>

        <span className="inline-flex h-10 shrink-0 items-center gap-2 rounded-md border border-border bg-background px-4 text-sm font-medium shadow-sm">
          {adminDateRange}
          <ChevronDown className="h-4 w-4 text-muted-foreground" aria-hidden="true" />
        </span>
      </div>

      <StatCardGrid metrics={adminMetrics} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Panel title="Task Completion Trend" className="lg:col-span-2">
          <TaskCompletionTrend data={taskCompletionTrend} />
        </Panel>

        <Panel title="Tasks by Status">
          <TasksByStatus data={tasksByStatus} total={tasksByStatusTotal} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RecentProjects projects={recentProjects} />
        <PendingItems items={pendingItems} />
        <SystemAlerts alerts={systemAlerts} />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <TopTrainers trainers={topTrainers} />

        <Panel title="Quality Score Trend" action={<RangeChip label="This Week" />}>
          <QualityScoreTrend data={qualityScoreTrend} />
        </Panel>
      </div>
    </div>
  );
}
