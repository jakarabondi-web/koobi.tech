import type { Metadata } from "next";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { expertUser } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default function DashboardLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-muted/40">
      <Sidebar variant="expert" />
      <div className="lg:pl-[260px]">
        <Topbar
          searchPlaceholder="Search tasks, projects, or resources..."
          user={expertUser}
        />
        <main className="mx-auto w-full max-w-content px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
