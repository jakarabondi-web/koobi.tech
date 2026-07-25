import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck, Users } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { isSuperAdmin, type GlobalRole } from "@/lib/permissions/roles";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";
import { EmptyState } from "@/components/shared/empty-state";
import { UserRoleManager } from "@/components/admin/user-role-manager";

export const metadata: Metadata = { title: "Users & roles" };

export default async function AdminUsersPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const canManage = isSuperAdmin(session.user.roles);

  const users = await prisma.user.findMany({
    include: { roles: { include: { role: true } } },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Users & roles"
        description="Grant and revoke platform access. Every change is written to the audit log."
      />

      {!canManage ? (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            You have read-only access. Only a Super Admin can change roles or account status.
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">All users ({users.length})</CardTitle>
        </CardHeader>
        <CardContent className="pb-6">
          {users.length === 0 ? (
            <EmptyState icon={Users} title="No users yet" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Roles & access</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {users.map((u) => (
                  <TableRow key={u.id}>
                    <TableCell>
                      <p className="font-medium">
                        {u.firstName} {u.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </TableCell>
                    <TableCell>
                      <StatusBadge status={u.status} />
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.createdAt.toLocaleDateString()}
                    </TableCell>
                    <TableCell className="min-w-[320px]">
                      <UserRoleManager
                        userId={u.id}
                        roles={u.roles.map((r) => r.role.key as GlobalRole)}
                        status={u.status}
                        canManage={canManage}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
