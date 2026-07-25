import type { Metadata } from "next";
import { Users, ShieldCheck } from "lucide-react";

import { prisma } from "@/lib/db/prisma";
import { requireTenant } from "@/server/services/tenant";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { InviteMemberForm } from "@/components/client/invite-member-form";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  const tenant = await requireTenant();

  const members = await prisma.organizationMember.findMany({
    where: { organizationId: tenant.organizationId },
    include: { user: true },
    orderBy: { invitedAt: "asc" },
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Team"
        description={`People with access to ${tenant.organizationName}.`}
      />

      {!tenant.isOrgAdmin ? (
        <div className="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm">
          <ShieldCheck className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
          <p className="text-muted-foreground">
            You have member access. Only organization admins can invite or remove people.
          </p>
        </div>
      ) : null}

      <Card>
        <CardContent className="pt-6 pb-6">
          {members.length === 0 ? (
            <EmptyState icon={Users} title="No team members" />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Member</TableHead><TableHead>Role</TableHead><TableHead>Status</TableHead><TableHead>Joined</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {members.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <p className="font-medium">{m.user.firstName} {m.user.lastName}</p>
                      <p className="text-xs text-muted-foreground">{m.user.email}</p>
                    </TableCell>
                    <TableCell><Badge variant="secondary">{m.role.replace(/_/g, " ").toLowerCase()}</Badge></TableCell>
                    <TableCell>
                      {m.joinedAt ? <Badge variant="success">Active</Badge> : <Badge variant="warning">Invited</Badge>}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {m.joinedAt?.toLocaleDateString() ?? "—"}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {tenant.isOrgAdmin ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Invite a teammate</CardTitle>
            <CardDescription>They&apos;ll get access to this organization&apos;s projects and data.</CardDescription>
          </CardHeader>
          <CardContent className="pb-6"><InviteMemberForm /></CardContent>
        </Card>
      ) : null}
    </div>
  );
}
