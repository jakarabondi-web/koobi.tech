import {
  Award,
  BadgeCheck,
  BarChart3,
  Bell,
  Blocks,
  Building2,
  CalendarCheck,
  ClipboardList,
  CreditCard,
  FileSearch,
  FileText,
  Gauge,
  HelpCircle,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  MessageSquareWarning,
  ScrollText,
  Settings,
  ShieldAlert,
  Sparkles,
  Star,
  Target,
  Ticket,
  UserCircle,
  UserPlus,
  Users,
  Wallet,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export interface NavGroup {
  label: string;
  items: NavItem[];
}

export const adminNavigation: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Overview", href: "/admin", icon: LayoutDashboard }],
  },
  {
    label: "Users",
    items: [
      { label: "Trainers", href: "/admin/trainers", icon: Users },
      { label: "Clients", href: "/admin/clients", icon: Building2 },
      { label: "Reviewers", href: "/admin/reviewers", icon: BadgeCheck },
      { label: "Leads", href: "/admin/leads", icon: UserPlus },
    ],
  },
  {
    label: "Projects",
    items: [
      { label: "All Projects", href: "/admin/projects", icon: Blocks },
      { label: "Tasks", href: "/admin/tasks", icon: ListChecks },
      { label: "Reviews", href: "/admin/reviews", icon: FileSearch },
    ],
  },
  {
    label: "Quality",
    items: [
      { label: "Quality Dashboard", href: "/admin/quality", icon: Gauge },
      { label: "Assessments", href: "/admin/assessments", icon: ClipboardList },
      { label: "Gold Tasks", href: "/admin/gold-tasks", icon: Star },
      { label: "Calibration", href: "/admin/calibration", icon: Target },
    ],
  },
  {
    label: "Payments",
    items: [
      { label: "Earnings", href: "/admin/earnings", icon: Wallet },
      { label: "Invoices", href: "/admin/invoices", icon: FileText },
      { label: "Disputes", href: "/admin/disputes", icon: MessageSquareWarning },
    ],
  },
  {
    label: "Support",
    items: [
      { label: "Tickets", href: "/admin/tickets", icon: Ticket },
      { label: "Alerts", href: "/admin/alerts", icon: Bell },
    ],
  },
  {
    label: "System",
    items: [
      { label: "Audit Logs", href: "/admin/audit-logs", icon: ScrollText },
      { label: "Fraud Detection", href: "/admin/fraud-detection", icon: ShieldAlert },
      { label: "Settings", href: "/admin/settings", icon: Settings },
    ],
  },
];

export const expertNavigation: NavGroup[] = [
  {
    label: "Dashboard",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Projects",
    items: [
      { label: "My Projects", href: "/dashboard/projects", icon: Blocks },
      { label: "Available Projects", href: "/dashboard/available", icon: Sparkles },
      { label: "Applications", href: "/dashboard/applications", icon: FileText },
    ],
  },
  {
    label: "Tasks",
    items: [
      { label: "My Tasks", href: "/dashboard/tasks", icon: CalendarCheck },
      { label: "Review Tasks", href: "/dashboard/review-tasks", icon: FileSearch },
      { label: "Gold Tasks", href: "/dashboard/gold-tasks", icon: Star },
    ],
  },
  {
    label: "Assessments",
    items: [
      { label: "My Assessments", href: "/dashboard/assessments", icon: ClipboardList },
      { label: "Results", href: "/dashboard/results", icon: BarChart3 },
    ],
  },
  {
    label: "Earnings",
    items: [
      { label: "Overview", href: "/dashboard/earnings", icon: Wallet },
      { label: "Payments", href: "/dashboard/payments", icon: CreditCard },
      { label: "Payout Methods", href: "/dashboard/payout-methods", icon: Award },
    ],
  },
  {
    label: "Account",
    items: [
      { label: "Profile", href: "/dashboard/profile", icon: UserCircle },
      { label: "Settings", href: "/dashboard/settings", icon: Settings },
      { label: "Notifications", href: "/dashboard/notifications", icon: Bell },
    ],
  },
  {
    label: "Support",
    items: [
      { label: "Help Center", href: "/dashboard/help", icon: HelpCircle },
      { label: "Contact Support", href: "/dashboard/support", icon: LifeBuoy },
    ],
  },
];
