import type {
  ActiveTask,
  Discipline,
  FeedbackItem,
  Metric,
  NetworkNode,
  NotificationItem,
  PendingItem,
  Project,
  QualityPoint,
  RecommendedProject,
  StatusSlice,
  SystemAlert,
  TimeSeriesPoint,
  TrainerLeaderboardRow,
  WeeklyProgressPoint,
} from "./types";

/* -------------------------------------------------------------------------- */
/*  Marketing site                                                            */
/* -------------------------------------------------------------------------- */

export const marketingNav = [
  { label: "Platform", href: "#platform" },
  { label: "Solutions", href: "#solutions" },
  { label: "Expert Network", href: "#network" },
  { label: "Quality", href: "#quality" },
  { label: "Security", href: "#security" },
  { label: "Resources", href: "#resources" },
];

export const heroHighlights = [
  { id: "verified", label: "Verified experts" },
  { id: "quality", label: "Measurable quality" },
  { id: "security", label: "Enterprise security" },
  { id: "scale", label: "Global scale" },
];

export const heroExperts = [
  { id: "software", label: "Software Engineer", x: 52, y: 8 },
  { id: "model", label: "Model Expert", x: 84, y: 26 },
  { id: "medical", label: "Medical Expert", x: 12, y: 30 },
  { id: "legal", label: "Legal Expert", x: 4, y: 62 },
  { id: "linguist", label: "Linguist", x: 88, y: 63 },
  { id: "researcher", label: "Researcher", x: 34, y: 90 },
];

export const trustedLogos = [
  "Nexora",
  "Vector Labs",
  "Helix AI",
  "Luminova",
  "Cinder",
  "Northstar Systems",
];

export const platformStats = [
  { id: "experts", value: "75,000+", label: "Verified experts" },
  { id: "countries", value: "120+", label: "Countries" },
  { id: "disciplines", value: "150+", label: "Professional disciplines" },
  { id: "languages", value: "40+", label: "Languages" },
  { id: "agreement", value: "98.4%", label: "Avg. review agreement" },
];

export const capabilities = [
  {
    id: "build",
    title: "Build high-quality data",
    description:
      "Create supervised fine-tuning data, preference pairs, domain content, and multilingual datasets.",
  },
  {
    id: "evaluate",
    title: "Evaluate with confidence",
    description:
      "Run expert evaluations, safety testing, factuality checks, and benchmarks with measurable quality.",
  },
  {
    id: "improve",
    title: "Continuously improve",
    description:
      "Monitor model performance, generate new evaluations, and close the loop with human feedback.",
  },
];

export const evaluationDimensions = [
  { id: "correctness", label: "Correctness", value: 94 },
  { id: "factuality", label: "Factuality", value: 89 },
  { id: "safety", label: "Safety", value: 97 },
  { id: "clarity", label: "Clarity", value: 91 },
];

export const disciplines: Discipline[] = [
  { id: "software", label: "Software Engineering" },
  { id: "mathematics", label: "Mathematics" },
  { id: "medicine", label: "Medicine" },
  { id: "law", label: "Law" },
  { id: "finance", label: "Finance" },
  { id: "data-science", label: "Data Science" },
  { id: "linguistics", label: "Linguistics" },
  { id: "research", label: "Research" },
];

export const networkNodes: NetworkNode[] = [
  { id: "sf", label: "San Francisco", x: 16, y: 38 },
  { id: "nyc", label: "New York", x: 25, y: 36 },
  { id: "bogota", label: "Bogotá", x: 27, y: 58 },
  { id: "sao-paulo", label: "São Paulo", x: 35, y: 70 },
  { id: "london", label: "London", x: 47, y: 29 },
  { id: "berlin", label: "Berlin", x: 52, y: 30 },
  { id: "lagos", label: "Lagos", x: 49, y: 57 },
  { id: "bangalore", label: "Bangalore", x: 68, y: 52 },
  { id: "singapore", label: "Singapore", x: 76, y: 60 },
  { id: "tokyo", label: "Tokyo", x: 84, y: 38 },
  { id: "sydney", label: "Sydney", x: 86, y: 76 },
];

/* -------------------------------------------------------------------------- */
/*  Admin dashboard                                                           */
/* -------------------------------------------------------------------------- */

export const adminUser = {
  name: "Alex Morgan",
  role: "Super Admin",
};

export const adminDateRange = "May 12 – May 18, 2025";

export const adminMetrics: Metric[] = [
  {
    id: "active-trainers",
    label: "Active Trainers",
    value: "12,847",
    delta: "12.4% from last week",
    direction: "up",
  },
  {
    id: "active-projects",
    label: "Active Projects",
    value: "128",
    delta: "8.2% from last week",
    direction: "up",
  },
  {
    id: "tasks-completed",
    label: "Tasks Completed",
    value: "32,841",
    delta: "13.7% from last week",
    direction: "up",
  },
  {
    id: "quality-score",
    label: "Quality Score",
    value: "96.4%",
    delta: "2.1% from last week",
    direction: "up",
  },
  {
    id: "total-payouts",
    label: "Total Payouts",
    value: "$284,915",
    delta: "6.6% from last week",
    direction: "up",
  },
];

export const taskCompletionTrend: TimeSeriesPoint[] = [
  { date: "May 12", completed: 24200, reviewed: 15800 },
  { date: "May 13", completed: 27400, reviewed: 19600 },
  { date: "May 14", completed: 24100, reviewed: 17400 },
  { date: "May 15", completed: 30500, reviewed: 21900 },
  { date: "May 16", completed: 28200, reviewed: 19800 },
  { date: "May 17", completed: 27300, reviewed: 19100 },
  { date: "May 18", completed: 34400, reviewed: 23600 },
];

export const tasksByStatus: StatusSlice[] = [
  {
    id: "in-progress",
    label: "In Progress",
    value: 18560,
    percent: 43,
    color: "#166534",
  },
  {
    id: "under-review",
    label: "Under Review",
    value: 12350,
    percent: 29,
    color: "#4ade80",
  },
  { id: "revision", label: "Revision", value: 6482, percent: 15, color: "#fcd34d" },
  { id: "approved", label: "Approved", value: 5390, percent: 13, color: "#22c55e" },
];

export const tasksByStatusTotal = tasksByStatus.reduce(
  (total, slice) => total + slice.value,
  0,
);

export const recentProjects: Project[] = [
  {
    id: "financial-research-eval",
    name: "Financial Research Eval",
    client: "Vector Labs",
    progress: 75,
    completedTasks: 18340,
    totalTasks: 24000,
  },
  {
    id: "code-generation-benchmark",
    name: "Code Generation Benchmark",
    client: "Helix AI",
    progress: 62,
    completedTasks: 12431,
    totalTasks: 20000,
  },
  {
    id: "legal-reasoning-dataset",
    name: "Legal Reasoning Dataset",
    client: "Nexora",
    progress: 40,
    completedTasks: 8100,
    totalTasks: 20000,
  },
  {
    id: "multilingual-sft-data",
    name: "Multilingual SFT Data",
    client: "Luminova",
    progress: 55,
    completedTasks: 11034,
    totalTasks: 20000,
  },
  {
    id: "medical-qa-evaluation",
    name: "Medical QA Evaluation",
    client: "Cinder Research",
    progress: 70,
    completedTasks: 14000,
    totalTasks: 20000,
  },
];

export const pendingItems: PendingItem[] = [
  {
    id: "trainer-applications",
    label: "Trainer applications",
    count: "132",
    note: "Requires review",
    icon: "user-check",
  },
  {
    id: "tasks-awaiting-review",
    label: "Tasks awaiting review",
    count: "1,342",
    note: "Across 43 projects",
    icon: "clipboard-check",
  },
  {
    id: "disputes-open",
    label: "Disputes open",
    count: "27",
    note: "Requires attention",
    icon: "message-square-warning",
  },
  {
    id: "failed-quality-checks",
    label: "Failed quality checks",
    count: "16",
    note: "Needs investigation",
    icon: "shield-alert",
  },
  {
    id: "payment-failures",
    label: "Payment failures",
    count: "12",
    note: "Payments failed",
    icon: "credit-card",
  },
];

export const systemAlerts: SystemAlert[] = [
  {
    id: "high-rejection",
    title: "High rejection rate detected",
    detail: "Project: Code Generation Benchmark",
    severity: "critical",
  },
  {
    id: "task-speed",
    title: "Unusual task speed detected",
    detail: "User: 7 trainers flagged",
    severity: "warning",
  },
  {
    id: "storage",
    title: "Storage usage high",
    detail: "86% of storage used",
    severity: "warning",
  },
  {
    id: "payment-failure",
    title: "Payment failure",
    detail: "12 payments failed",
    severity: "warning",
  },
  {
    id: "fraud-signals",
    title: "New fraud signals",
    detail: "18 accounts flagged",
    severity: "warning",
  },
];

export const topTrainers: TrainerLeaderboardRow[] = [
  {
    id: "eleanor-pena",
    name: "Eleanor Pena",
    qualityScore: 98.7,
    tasksCompleted: 1432,
    approvalRate: 99,
  },
  {
    id: "devon-lane",
    name: "Devon Lane",
    qualityScore: 97.9,
    tasksCompleted: 1210,
    approvalRate: 98,
  },
  {
    id: "kathryn-murphy",
    name: "Kathryn Murphy",
    qualityScore: 97.2,
    tasksCompleted: 1098,
    approvalRate: 97,
  },
  {
    id: "wade-warren",
    name: "Wade Warren",
    qualityScore: 96.8,
    tasksCompleted: 1023,
    approvalRate: 97,
  },
  {
    id: "esther-howard",
    name: "Esther Howard",
    qualityScore: 96.5,
    tasksCompleted: 987,
    approvalRate: 96,
  },
];

export const qualityScoreTrend: QualityPoint[] = [
  { date: "May 12", score: 93.4 },
  { date: "May 13", score: 95.1 },
  { date: "May 14", score: 94.8 },
  { date: "May 15", score: 96.6 },
  { date: "May 16", score: 96.1 },
  { date: "May 17", score: 97.0 },
  { date: "May 18", score: 97.4 },
];

/* -------------------------------------------------------------------------- */
/*  Expert dashboard                                                          */
/* -------------------------------------------------------------------------- */

export const expertUser = {
  name: "Olivia Bennett",
  role: "Expert Trainer",
  firstName: "Olivia",
};

export const expertMetrics: Metric[] = [
  {
    id: "quality-score",
    label: "Quality Score",
    value: "96.8%",
    note: "Excellent",
  },
  {
    id: "tasks-completed",
    label: "Tasks Completed",
    value: "1,247",
    delta: "56 this week",
    direction: "up",
  },
  {
    id: "earnings-this-week",
    label: "Earnings This Week",
    value: "$842.50",
    delta: "12% this week",
    direction: "up",
  },
  {
    id: "pending-payment",
    label: "Pending Payment",
    value: "$1,256.00",
    note: "Will be paid May 25",
  },
  {
    id: "active-projects",
    label: "Active Projects",
    value: "3",
    action: { label: "View projects", href: "/dashboard/projects" },
  },
];

export const activeTasks: ActiveTask[] = [
  {
    id: "task-001521",
    title: "Math Reasoning Evaluation",
    reference: "Task #001521",
    estimate: "Est. 2h 10m",
    payout: 4.5,
    dueIn: "Due in 2h 15m",
    urgent: true,
  },
  {
    id: "task-001522",
    title: "Code Generation Review",
    reference: "Task #001522",
    estimate: "Est. 3h 05m",
    payout: 6.0,
    dueIn: "Due in 3h 42m",
  },
  {
    id: "task-001523",
    title: "Safety Classification",
    reference: "Task #001523",
    estimate: "Est. 1h 40m",
    payout: 3.25,
    dueIn: "Due in 5h 10m",
  },
];

export const weeklyTaskProgress: WeeklyProgressPoint[] = [
  { day: "Mon", completed: 85, reviewed: 97 },
  { day: "Tue", completed: 118, reviewed: 131 },
  { day: "Wed", completed: 150, reviewed: 165 },
  { day: "Thu", completed: 97, reviewed: 110 },
  { day: "Fri", completed: 105, reviewed: 120 },
  { day: "Sat", completed: 66, reviewed: 78 },
  { day: "Sun", completed: 29, reviewed: 37 },
];

export const recommendedProjects: RecommendedProject[] = [
  {
    id: "medical-qa-evaluation",
    name: "Medical QA Evaluation",
    client: "Cinder Research",
    rate: "$5.50 – $7.00 per task",
    commitment: "8–10 hrs/week",
    match: 96,
  },
  {
    id: "legal-reasoning-dataset",
    name: "Legal Reasoning Dataset",
    client: "Nexora",
    rate: "$7.00 – $9.00 per task",
    commitment: "5–8 hrs/week",
    match: 90,
  },
  {
    id: "multilingual-sft-project",
    name: "Multilingual SFT Project",
    client: "Vector Labs",
    rate: "$5.00 – $6.50 per task",
    commitment: "10–13 hrs/week",
    match: 90,
  },
];

export const recentFeedback: FeedbackItem[] = [
  {
    id: "feedback-1",
    message: "Great attention to detail and accurate scoring.",
    project: "Math Reasoning Eval",
    timeAgo: "2h ago",
    sentiment: "positive",
  },
  {
    id: "feedback-2",
    message: "Your justifications are very helpful.",
    project: "Code Generation Review",
    timeAgo: "1d ago",
    sentiment: "positive",
  },
  {
    id: "feedback-3",
    message: "Try to provide more examples in your reasoning.",
    project: "Safety Classification",
    timeAgo: "3d ago",
    sentiment: "needs-work",
  },
];

export const expertNotifications: NotificationItem[] = [
  {
    id: "notification-1",
    title: "New task available",
    detail: "Math Reasoning Evaluation",
    timeAgo: "2m ago",
    tone: "success",
  },
  {
    id: "notification-2",
    title: "Your task was approved",
    detail: "Code Generation Review",
    timeAgo: "1h ago",
    tone: "info",
  },
  {
    id: "notification-3",
    title: "Payment scheduled",
    detail: "$1,156.00",
    timeAgo: "3h ago",
    tone: "payment",
  },
  {
    id: "notification-4",
    title: "New project match",
    detail: "Medical QA Evaluation",
    timeAgo: "1d ago",
    tone: "info",
  },
  {
    id: "notification-5",
    title: "Assessment assigned",
    detail: "Safety & Policy Evaluation",
    timeAgo: "2d ago",
    tone: "info",
  },
];

export const growthBenefits = [
  "Complete assessments",
  "Maintain high quality",
  "Get advanced projects",
  "Earn quality bonuses",
];
