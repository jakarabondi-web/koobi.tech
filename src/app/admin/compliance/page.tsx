import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck, FileCheck, Globe, UserCheck } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";

export const metadata: Metadata = { title: "Compliance" };

export default async function CompliancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const [identityCounts, consents, jurisdictionRules, verifiedUsers] = await Promise.all([
    prisma.identityVerification.groupBy({ by: ["status"], _count: true }),
    prisma.consentRecord.findMany({ include: { user: true }, orderBy: { acceptedAt: "desc" }, take: 25 }),
    prisma.projectJurisdictionRule.findMany({ include: { project: true } }),
    prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
  ]);
  const idCount = (s: string) => identityCounts.find((c) => c.status === s)?._count ?? 0;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance"
        description="Identity verification coverage, consent records, and jurisdiction controls."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiCard label="Identity verified" value={String(idCount("VERIFIED"))} icon={UserCheck} />
        <KpiCard label="Verification pending" value={String(idCount("PENDING"))} icon={ShieldCheck} />
        <KpiCard label="Email verified users" value={String(verifiedUsers)} icon={FileCheck} />
        <KpiCard label="Jurisdiction rules" value={String(jurisdictionRules.length)} icon={Globe} />
      </div>

      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Data handling</p>
        <p className="mt-1">
          Identity verification stores decisions only — no document images, selfies, or biometric
          templates are retained on this platform. Location data is coarse (country-level from IP)
          and never GPS. See SECURITY.md for the full boundary.
        </p>
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Project jurisdiction rules</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {jurisdictionRules.length === 0 ? (
            <EmptyState icon={Globe} title="No jurisdiction rules"
              description="Projects with data-residency or language requirements can restrict which countries trainers work from." />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Project</TableHead><TableHead>Mode</TableHead><TableHead>Country</TableHead>
                <TableHead>Blocks VPN</TableHead><TableHead>Reason</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {jurisdictionRules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-52 truncate">{r.project.name}</TableCell>
                    <TableCell><StatusBadge status={r.mode} /></TableCell>
                    <TableCell className="font-mono text-xs">{r.countryCode}</TableCell>
                    <TableCell className="text-sm">{r.blockVpn ? "Yes" : "No"}</TableCell>
                    <TableCell className="max-w-sm truncate text-sm text-muted-foreground">{r.reason ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Recent consent records</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {consents.length === 0 ? <EmptyState title="No consent records" /> : (
            <Table>
              <TableHeader><TableRow><TableHead>User</TableHead><TableHead>Consent type</TableHead><TableHead>Version</TableHead><TableHead>Accepted</TableHead></TableRow></TableHeader>
              <TableBody>
                {consents.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm">{c.user.firstName} {c.user.lastName}</TableCell>
                    <TableCell className="font-mono text-xs">{c.type}</TableCell>
                    <TableCell className="text-xs">{c.version}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{c.acceptedAt.toLocaleDateString()}</TableCell>
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
