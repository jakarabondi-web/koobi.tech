"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Sparkles, LogOut, Menu, Search, Bell } from "lucide-react";
import { useState, type ComponentType } from "react";

import { cn } from "@/lib/utils/cn";
import { brand } from "@/config/brand";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { NeuralMesh } from "@/components/shared/neural-mesh";
import { AmbientGrid } from "@/components/shared/ambient-grid";

export type NavItem = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  badge?: string | number;
};

export type NavSection = {
  label: string;
  items: NavItem[];
};

export function DashboardShell({
  navSections,
  surfaceLabel,
  userName,
  userEmail,
  userRoleLabel,
  unreadNotifications = 0,
  notificationsHref,
  children,
}: {
  navSections: NavSection[];
  surfaceLabel: string;
  userName: string;
  userEmail: string;
  userRoleLabel?: string;
  unreadNotifications?: number;
  notificationsHref?: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);

  const initials = userName
    .split(" ")
    .map((p) => p[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const sidebar = (
    <div className="relative flex h-full flex-col overflow-hidden bg-sidebar text-sidebar-foreground">
      {/* Ambient mesh — strongest toward the base of the nav, dissolving
          upward so the brand mark and links stay fully legible. Dark tone
          (pale lines) to match the sidebar's dark background. */}
      <NeuralMesh fade="up" density={0.00022} maxNodes={40} linkDistance={78} opacity={0.8} />

      <div className="relative z-10 flex h-16 items-center gap-2 px-5">
        <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent-violet text-white">
          <Sparkles className="size-4" />
        </span>
        <div className="min-w-0 leading-tight">
          <p className="text-sm font-semibold">{brand.name}</p>
          <div className="flex items-center gap-1.5 text-[11px] text-sidebar-foreground/60">
            <span className="relative flex size-1.5 shrink-0">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-success opacity-75" />
              <span className="relative inline-flex size-1.5 rounded-full bg-success" />
            </span>
            <span className="truncate font-mono">{surfaceLabel}</span>
          </div>
        </div>
      </div>
      <nav className="relative z-10 flex-1 space-y-4 overflow-y-auto px-3 py-3">
        {navSections.map((section) => (
          <div key={section.label}>
            <p className="px-3 pb-1 font-mono text-[10px] font-semibold uppercase tracking-wider text-sidebar-foreground/45">
              {section.label}
            </p>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const active = pathname === item.href || pathname.startsWith(item.href + "/");
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    onClick={() => setMobileOpen(false)}
                    className={cn(
                      "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-sidebar-accent text-sidebar-accent-foreground"
                        : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
                    )}
                  >
                    <item.icon className="size-4 shrink-0" />
                    <span className="flex-1 truncate">{item.label}</span>
                    {item.badge ? (
                      <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent-violet px-1.5 text-[10px] font-semibold text-white">
                        {item.badge}
                      </span>
                    ) : null}
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
      <div className="relative z-10 border-t border-sidebar-border p-3">
        <div className="flex items-center gap-2 rounded-md px-2 py-2">
          <Avatar className="size-8">
            <AvatarFallback className="bg-sidebar-accent text-sidebar-accent-foreground">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0 flex-1 leading-tight">
            <p className="truncate text-xs font-medium">{userName}</p>
            <p className="truncate text-[11px] text-sidebar-foreground/60">{userRoleLabel ?? userEmail}</p>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="size-7 text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
            onClick={() => signOut({ callbackUrl: "/" })}
            aria-label="Sign out"
          >
            <LogOut className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block">{sidebar}</aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            className="absolute inset-0 bg-black/50"
            aria-label="Close menu"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative h-full w-64">{sidebar}</div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 items-center gap-3 border-b border-border bg-background px-4 lg:px-6">
          <button
            aria-label="Open menu"
            className="inline-flex size-9 items-center justify-center rounded-md border border-border lg:hidden"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-4" />
          </button>
          <span className="text-sm font-semibold lg:hidden">{brand.name}</span>

          <div className="relative hidden max-w-sm flex-1 lg:block">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              placeholder="Search tasks, projects, or resources…"
              className="h-9 w-full rounded-md border border-input bg-transparent pl-9 pr-3 text-sm outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-2 focus-visible:ring-ring/30"
            />
          </div>

          <div className="ml-auto flex items-center gap-1">
            <Button variant="ghost" size="icon" className="relative" asChild>
              <Link href={notificationsHref ?? "#"} aria-label="Notifications">
                <Bell className="size-4" />
                {unreadNotifications > 0 ? (
                  <span className="absolute right-1.5 top-1.5 flex size-2 rounded-full bg-destructive" />
                ) : null}
              </Link>
            </Button>
          </div>
        </header>
        <main className="relative flex-1 overflow-x-hidden bg-surface">
          <AmbientGrid />
          <div className="relative z-10 p-4 sm:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </div>
  );
}
