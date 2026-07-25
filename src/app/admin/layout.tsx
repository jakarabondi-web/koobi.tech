import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { AdminShell } from "@/components/admin/admin-shell";

function humanizeRole(role?: string) {
  if (!role) return "Staff";
  return role.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await auth();

  const [pendingApplications, payoutQueue] = await Promise.all([
    prisma.application.count({ where: { status: { in: ["SUBMITTED", "UNDER_REVIEW"] } } }),
    prisma.payoutRequest.count({ where: { status: { in: ["REQUESTED", "APPROVED"] } } }),
  ]);

  return (
    <AdminShell
      userName={session?.user?.name ?? "Admin"}
      userEmail={session?.user?.email ?? ""}
      roleLabel={humanizeRole(session?.user?.roles?.[0])}
      pendingApplications={pendingApplications}
      payoutQueue={payoutQueue}
    >
      {children}
    </AdminShell>
  );
}
