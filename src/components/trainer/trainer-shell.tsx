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
  Scale,
  ShieldCheck,
} from "lucide-react";

import { DashboardShell, type NavSection } from "@/components/navigation/dashboard-shell";

/**
 * What an applicant sees before they're approved: the steps that get them
 * approved, and a way to ask for help. Everything else in the portal — the
 * marketplace, task queues, earnings, payout details — is about work they
 * cannot be given yet, so showing it only invites dead ends.
 *
 * Profile is deliberately absent: before approval it is read-only, repeats
 * the application and identity status the dashboard already shows, and
 * reports an empty quality score for work not yet done.
 *
 * Two things this does *not* do, both on purpose:
 *
 * - It does not secure anything. `requireApprovedTrainer` is what keeps the
 *   restricted pages closed; hiding a link has never been a control.
 * - It does not take pages away. Settings, notifications and profile stay
 *   reachable by URL, and the header keeps its notification bell. Cutting
 *   off account settings would mean an applicant could not turn on
 *   two-factor auth until approved, which trades real account security for
 *   a tidier sidebar.
 */
function buildApplicantNavSections(): NavSection[] {
  return [
    {
      label: "Dashboard",
      items: [{ href: "/trainer/dashboard", label: "Overview", icon: LayoutDashboard }],
    },
    {
      label: "Getting approved",
      items: [
        { href: "/trainer/onboarding", label: "Application", icon: ClipboardList },
        { href: "/trainer/assessments", label: "Assessment", icon: GraduationCap },
        { href: "/trainer/verification", label: "Identity", icon: ShieldCheck },
      ],
    },
    {
      label: "Support",
      items: [{ href: "/trainer/support", label: "Help center", icon: LifeBuoy }],
    },
  ];
}

function buildNavSections(counts: {
  tasksDue: number;
  unreadNotifications: number;
  reviewQueue: number;
  adjudicationQueue: number;
  isReviewer: boolean;
  isLeadReviewer: boolean;
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
              ...(counts.isLeadReviewer
                ? [
                    {
                      href: "/trainer/adjudication",
                      label: "Adjudication",
                      icon: Scale,
                      badge: counts.adjudicationQueue || undefined,
                    },
                  ]
                : []),
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
  adjudicationQueue = 0,
  isReviewer = false,
  isLeadReviewer = false,
  isApproved = false,
  children,
}: {
  userName: string;
  userEmail: string;
  tasksDue?: number;
  unreadNotifications?: number;
  reviewQueue?: number;
  adjudicationQueue?: number;
  isReviewer?: boolean;
  isLeadReviewer?: boolean;
  /** Cleared for paid work. Applicants get a much smaller portal. */
  isApproved?: boolean;
  children: React.ReactNode;
}) {
  return (
    <DashboardShell
      navSections={
        isApproved
          ? buildNavSections({
              tasksDue, unreadNotifications, reviewQueue, adjudicationQueue, isReviewer, isLeadReviewer,
            })
          : buildApplicantNavSections()
      }
      surfaceLabel="Trainer portal"
      userName={userName}
      userEmail={userEmail}
      userRoleLabel={isLeadReviewer ? "Lead reviewer" : isReviewer ? "Reviewer" : "Trainer"}
      unreadNotifications={unreadNotifications}
      notificationsHref="/trainer/notifications"
    >
      {children}
    </DashboardShell>
  );
}
