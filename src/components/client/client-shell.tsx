"use client";

import {
  LayoutDashboard, Briefcase, Plus, Database, Download, Users,
  CreditCard, Receipt, Code2, ShieldCheck, Settings,
} from "lucide-react";

import { DashboardShell, type NavSection } from "@/components/navigation/dashboard-shell";

function buildNavSections(counts: { activeProjects: number; readyExports: number }): NavSection[] {
  return [
    { label: "Overview", items: [{ href: "/client/dashboard", label: "Dashboard", icon: LayoutDashboard }] },
    {
      label: "Projects",
      items: [
        { href: "/client/projects", label: "All projects", icon: Briefcase, badge: counts.activeProjects || undefined },
        { href: "/client/projects/new", label: "Create project", icon: Plus },
      ],
    },
    {
      label: "Data",
      items: [
        { href: "/client/datasets", label: "Datasets", icon: Database },
        { href: "/client/exports", label: "Exports", icon: Download, badge: counts.readyExports || undefined },
      ],
    },
    {
      label: "Organization",
      items: [
        { href: "/client/team", label: "Team", icon: Users },
        { href: "/client/billing", label: "Billing", icon: CreditCard },
        { href: "/client/invoices", label: "Invoices", icon: Receipt },
      ],
    },
    {
      label: "Developer",
      items: [
        { href: "/client/api", label: "API & webhooks", icon: Code2 },
        { href: "/client/security", label: "Security", icon: ShieldCheck },
        { href: "/client/settings", label: "Settings", icon: Settings },
      ],
    },
  ];
}

export function ClientShell({
  userName, userEmail, orgName, activeProjects = 0, readyExports = 0, children,
}: {
  userName: string; userEmail: string; orgName: string;
  activeProjects?: number; readyExports?: number; children: React.ReactNode;
}) {
  return (
    <DashboardShell
      navSections={buildNavSections({ activeProjects, readyExports })}
      surfaceLabel={orgName}
      userName={userName}
      userEmail={userEmail}
      userRoleLabel="Client"
      notificationsHref="/client/dashboard"
    >
      {children}
    </DashboardShell>
  );
}
