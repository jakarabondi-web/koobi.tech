import { WeeklyTaskProgress } from "@/components/charts/weekly-task-progress";
import { Panel } from "@/components/dashboard/panel";
import { StatCardGrid } from "@/components/dashboard/stat-card";
import { ActiveTasks } from "@/components/expert/active-tasks";
import { GrowthCard } from "@/components/expert/growth-card";
import { NotificationsPanel } from "@/components/expert/notifications-panel";
import { RecentFeedback } from "@/components/expert/recent-feedback";
import { RecommendedProjects } from "@/components/expert/recommended-projects";
import {
  activeTasks,
  expertMetrics,
  expertNotifications,
  expertUser,
  growthBenefits,
  recentFeedback,
  recommendedProjects,
  weeklyTaskProgress,
} from "@/lib/mock-data";

export default function ExpertDashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">
          Welcome back, {expertUser.firstName}!{" "}
          <span role="img" aria-label="waving hand">
            👋
          </span>
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Here&apos;s your work summary and next steps.
        </p>
      </div>

      <StatCardGrid metrics={expertMetrics} />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ActiveTasks tasks={activeTasks} />

        <Panel title="Weekly Task Progress" className="lg:col-span-2">
          <WeeklyTaskProgress data={weeklyTaskProgress} />
        </Panel>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <RecommendedProjects projects={recommendedProjects} />
        <div className="lg:col-span-2">
          <RecentFeedback feedback={recentFeedback} />
        </div>
      </div>

      <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-2">
        <NotificationsPanel items={expertNotifications} />
        <GrowthCard benefits={growthBenefits} />
      </div>
    </div>
  );
}
