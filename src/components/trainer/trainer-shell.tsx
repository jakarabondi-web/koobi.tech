"use client";

import {
  LayoutDashboard,
  Briefcase,
  ListChecks,
  ClipboardList,
  Medal,
  GraduationCap,
  BarChart3,
  Wallet,
  CreditCard,
  Landmark,
  UserCircle,
  Settings,
  Bell,
  LifeBuoy,
  MessageCircleQuestion,
  ClipboardCheck,
} from "lucide-react";

import { DashboardShell, type NavSection } from "@/components/navigation/dashboard-shell";

function buildNavSections(counts: {
  tasksDue: number;
  unreadNotifications: number;
  reviewQueue: number;
  isReviewer: boolean;
}): NavSection[] {
  return [
    {
      label: "Dashboard",
      items: [{ href: "/trainer/dashboard", label: "Overview", icon: LayoutDashboard }],
    },
    {
      label: "Projects",
      items: [
        { href: "/trainer/projects", label: "Marketplace", icon: Briefcase },
        { href: "/trainer/projects/mine", label: "My projects", icon: ClipboardList },
      ],
    },
    {
      label: "Tasks",
      items: [
        { href: "/trainer/tasks", label: "My tasks", icon: ListChecks, badge: counts.tasksDue || undefined },
        { href: "/trainer/tasks/gold", label: "Gold tasks", icon: Medal },
      ],
    },
    ...(counts.isReviewer
      ? [
          {
            label: "Reviewing",
            items: [
              {
                href: "/trainer/review",
                label: "Review queue",
                icon: ClipboardCheck,
                badge: counts.reviewQueue || undefined,
              },
            ],
          },
        ]
      : []),
    {
      label: "Assessments",
      items: [{ href: "/trainer/assessments", label: "My assessments", icon: GraduationCap }],
    },
    {
      label: "Quality & earnings",
      items: [
        { href: "/trainer/quality", label: "Quality", icon: BarChart3 },
        { href: "/trainer/earnings", label: "Earnings", icon: Wallet },
        { href: "/trainer/payments", label: "Payment methods", icon: CreditCard },
        { href: "/trainer/payments/tax", label: "Tax documents", icon: Landmark },
      ],
    },
    {
      label: "Account",
      items: [
        { href: "/trainer/notifications", label: "Notifications", icon: Bell, badge: counts.unreadNotifications || undefined },
        { href: "/trainer/profile", label: "Profile", icon: UserCircle },
        { href: "/trainer/settings", label: "Settings", icon: Settings },
      ],
    },
    {
      label: "Support",
      items: [
        { href: "/trainer/support", label: "Help center", icon: LifeBuoy },
        { href: "/trainer/support/tickets", label: "My tickets", icon: MessageCircleQuestion },
      ],
    },
  ];
}

export function TrainerShell({
  userName,
  userEmail,
  tasksDue = 0,
  unreadNotifications = 0,
  reviewQueue = 0,
  isReviewer = false,
  children,
}: {
  userName: string;
  userEmail: string;
  tasksDue?: number;
  unreadNotifications?: number;
  reviewQueue?: number;
  isReviewer?: boolean;
  children: React.ReactNode;
}) {
  return (
    <DashboardShell
      navSections={buildNavSections({ tasksDue, unreadNotifications, reviewQueue, isReviewer })}
      surfaceLabel="Trainer portal"
      userName={userName}
      userEmail={userEmail}
      userRoleLabel={isReviewer ? "Reviewer" : "Trainer"}
      unreadNotifications={unreadNotifications}
      notificationsHref="/trainer/notifications"
    >
      {children}
    </DashboardShell>
  );
}
