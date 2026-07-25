/**
 * Data schema for the Trainora AI platform.
 *
 * Every dashboard surface reads from these shapes, so swapping the mock
 * source in `src/lib/mock-data.ts` for real API responses only requires
 * matching these types.
 */

export type TrendDirection = "up" | "down" | "flat";

export interface Metric {
  id: string;
  label: string;
  value: string;
  /** Optional delta, e.g. "12.4% from last week". */
  delta?: string;
  direction?: TrendDirection;
  /** Non-delta footnote, e.g. "Will be paid May 25". */
  note?: string;
  /** Renders the footnote as a link-style action. */
  action?: { label: string; href: string };
}

export interface TimeSeriesPoint {
  date: string;
  completed: number;
  reviewed: number;
}

export interface StatusSlice {
  id: string;
  label: string;
  value: number;
  percent: number;
  color: string;
}

export interface Project {
  id: string;
  name: string;
  client: string;
  progress: number;
  completedTasks: number;
  totalTasks: number;
}

export interface PendingItem {
  id: string;
  label: string;
  count: string;
  note: string;
  icon: "user-check" | "clipboard-check" | "message-square-warning" | "shield-alert" | "credit-card";
}

export type AlertSeverity = "critical" | "warning" | "info";

export interface SystemAlert {
  id: string;
  title: string;
  detail: string;
  severity: AlertSeverity;
}

export interface TrainerLeaderboardRow {
  id: string;
  name: string;
  qualityScore: number;
  tasksCompleted: number;
  approvalRate: number;
}

export interface QualityPoint {
  date: string;
  score: number;
}

export interface ActiveTask {
  id: string;
  title: string;
  reference: string;
  estimate: string;
  payout: number;
  dueIn: string;
  /** Marks a task as close to its deadline (rendered in amber). */
  urgent?: boolean;
}

export interface WeeklyProgressPoint {
  day: string;
  completed: number;
  reviewed: number;
}

export interface RecommendedProject {
  id: string;
  name: string;
  client: string;
  rate: string;
  commitment: string;
  match: number;
}

export interface FeedbackItem {
  id: string;
  message: string;
  project: string;
  timeAgo: string;
  sentiment: "positive" | "needs-work";
}

export interface NotificationItem {
  id: string;
  title: string;
  detail: string;
  timeAgo: string;
  tone: "success" | "info" | "payment";
}

export interface Discipline {
  id: string;
  label: string;
}

export interface NetworkNode {
  id: string;
  label: string;
  /** Percentage coordinates within the map container. */
  x: number;
  y: number;
}
