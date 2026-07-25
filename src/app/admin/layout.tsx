import type { Metadata } from "next";

import { Sidebar } from "@/components/dashboard/sidebar";
import { Topbar } from "@/components/dashboard/topbar";
import { adminUser } from "@/lib/mock-data";

export const metadata: Metadata = {
  title: "Admin",
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className="min-h-screen bg-muted/40">
      <Sidebar variant="admin" />
      <div className="lg:pl-[260px]">
        <Topbar searchPlaceholder="Search anything..." user={adminUser} />
        <main className="mx-auto w-full max-w-content px-4 py-8 sm:px-6">
          {children}
        </main>
      </div>
    </div>
  );
}
