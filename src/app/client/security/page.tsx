import type { Metadata } from "next";
import { headers } from "next/headers";
import { Lock, FileClock, Building2, ShieldCheck, EyeOff, Globe } from "lucide-react";

import { prisma } from "@/lib/db/prisma";
import { clientSecretFor } from "@/lib/auth/sso";
import { requireTenant } from "@/server/services/tenant";
import { SsoSettings } from "@/components/client/sso-settings";
import { PageHeader } from "@/components/shared/page-header";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Security" };

const CONTROLS = [
  { icon: Building2, title: "Tenant isolation", desc: "Every query is scoped to your organization by membership — never by a role check alone." },
  { icon: Lock, title: "Role-based access", desc: "Permissions are enforced server-side on every action, not by hiding UI." },
  { icon: FileClock, title: "Audit logging", desc: "Project changes, exports, and member invitations are recorded with actor and timestamp." },
  { icon: EyeOff, title: "Expert identity shielding", desc: "You see aggregate workforce data; individual expert identities are not exposed." },
  { icon: ShieldCheck, title: "Verified workforce", desc: "Every expert passes identity verification and a domain assessment before touching your data." },
  { icon: Globe, title: "Jurisdiction controls", desc: "Restrict a project to specific countries for data-residency or language requirements." },
];

export default async function ClientSecurityPage() {
  const tenant = await requireTenant();

  const [auditLogs, rules, org, headerList] = await Promise.all([
    prisma.auditLog.findMany({
      where: { organizationId: tenant.organizationId },
      include: { actor: true },
      orderBy: { createdAt: "desc" },
      take: 25,
    }),
    prisma.projectJurisdictionRule.findMany({
      where: { project: { organizationId: tenant.organizationId } },
      include: { project: true },
    }),
    prisma.organization.findUniqueOrThrow({
      where: { id: tenant.organizationId },
      select: {
        slug: true,
        ssoDomain: true,
        ssoDomainVerifiedAt: true,
        ssoDomainToken: true,
        ssoIssuerUrl: true,
        ssoClientId: true,
        ssoProviderName: true,
        ssoEnforced: true,
      },
    }),
    headers(),
  ]);

  const secretEnvVar = `SSO_CLIENT_SECRET_${org.slug.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  const host = headerList.get("host") ?? "localhost:3000";
  const proto = headerList.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");

  return (
    <div className="space-y-6">
      <PageHeader title="Security" description="How your data and workforce are protected." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {CONTROLS.map((c) => (
          <div key={c.title} className="rounded-xl border border-border bg-card p-5">
            <c.icon className="size-5 text-primary" />
            <h3 className="mt-3 text-sm font-semibold">{c.title}</h3>
            <p className="mt-1.5 text-sm text-muted-foreground">{c.desc}</p>
          </div>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Jurisdiction rules</CardTitle>
          <CardDescription>Countries your projects are restricted to, if any.</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          {rules.length === 0 ? (
            <EmptyState icon={Globe} title="No restrictions set"
              description="Projects are open to qualified experts in any supported country. Contact your operations manager to add a restriction." />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Project</TableHead><TableHead>Mode</TableHead><TableHead>Country</TableHead><TableHead>Reason</TableHead></TableRow></TableHeader>
              <TableBody>
                {rules.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="max-w-52 truncate">{r.project.name}</TableCell>
                    <TableCell><Badge variant={r.mode === "ALLOW" ? "success" : "destructive"}>{r.mode.toLowerCase()}</Badge></TableCell>
                    <TableCell className="font-mono text-xs">{r.countryCode}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{r.reason ?? "—"}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Single sign-on</CardTitle>
          <CardDescription>
            Connect your identity provider over OIDC so your team signs in with their existing
            corporate account.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <SsoSettings
            canManage={tenant.isOrgAdmin}
            redirectUri={`${proto}://${host}/api/auth/sso/callback`}
            config={{
              domain: org.ssoDomain,
              verifiedAt: org.ssoDomainVerifiedAt?.toISOString() ?? null,
              token: org.ssoDomainToken,
              issuerUrl: org.ssoIssuerUrl,
              clientId: org.ssoClientId,
              providerName: org.ssoProviderName,
              enforced: org.ssoEnforced,
              // Only whether it exists crosses to the browser, never its value.
              secretConfigured: clientSecretFor(org.slug) !== null,
              secretEnvVar,
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity log</CardTitle>
          <CardDescription>Actions taken on your organization&apos;s data.</CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          {auditLogs.length === 0 ? (
            <EmptyState icon={FileClock} title="No recorded activity yet" />
          ) : (
            <Table>
              <TableHeader><TableRow><TableHead>Action</TableHead><TableHead>By</TableHead><TableHead>When</TableHead></TableRow></TableHeader>
              <TableBody>
                {auditLogs.map((l) => (
                  <TableRow key={l.id}>
                    <TableCell><Badge variant="outline" className="font-mono text-[11px]">{l.action}</Badge></TableCell>
                    <TableCell className="text-sm">{l.actor ? `${l.actor.firstName} ${l.actor.lastName}` : "System"}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{l.createdAt.toLocaleString()}</TableCell>
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
