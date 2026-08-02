import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck, FileCheck, Globe, UserCheck, CalendarClock } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { can } from "@/lib/permissions/can";
import { credentialExpiryStatus, daysUntil } from "@/lib/utils/credential-expiry";
import { PageHeader } from "@/components/shared/page-header";
import { KpiCard } from "@/components/shared/kpi-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/ui/badge-status";
import { Badge } from "@/components/ui/badge";
import { IdentityReviewForm } from "@/components/admin/identity-review-form";
import { getManualVerificationPreviewUrls } from "@/server/services/manual-identity-verification";

export const metadata: Metadata = { title: "Compliance" };

export default async function CompliancePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const canReview = can(session.user.roles, "trainer.approve");

  const [identityCounts, consents, jurisdictionRules, verifiedUsers, verifiedWithExpiry, pendingVerifications] =
    await Promise.all([
      prisma.identityVerification.groupBy({ by: ["status"], _count: true }),
      prisma.consentRecord.findMany({ include: { user: true }, orderBy: { acceptedAt: "desc" }, take: 25 }),
      prisma.projectJurisdictionRule.findMany({ include: { project: true } }),
      prisma.user.count({ where: { emailVerifiedAt: { not: null } } }),
      prisma.identityVerification.findMany({
        where: { status: "VERIFIED", expiresAt: { not: null } },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { expiresAt: "asc" },
      }),
      prisma.identityVerification.findMany({
        where: {
          status: "PENDING",
          submittedAt: { not: null },
          OR: [
            { documentAuthentic: "FAIL" },
            { livenessPassed: "FAIL" },
            { faceMatchPassed: "FAIL" },
            { duplicateCheckPassed: "FAIL" },
            // Manually-submitted rows have no automated checks at all —
            // they need a human look regardless of check state.
            { provider: "manual" },
          ],
        },
        include: { user: { select: { firstName: true, lastName: true, email: true } } },
        orderBy: { submittedAt: "asc" },
      }),
    ]);
  const idCount = (s: string) => identityCounts.find((c) => c.status === s)?._count ?? 0;

  const expiringOrExpired = verifiedWithExpiry
    .map((v) => ({ ...v, expiryStatus: credentialExpiryStatus(v.expiresAt) }))
    .filter((v) => v.expiryStatus === "expiring_soon" || v.expiryStatus === "expired");

  const previewsByUserId = new Map(
    await Promise.all(
      pendingVerifications
        .filter((v) => v.provider === "manual")
        .map(async (v) => [v.userId, await getManualVerificationPreviewUrls(v)] as const)
    )
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Compliance"
        description="Identity verification coverage, consent records, and jurisdiction controls."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
        <KpiCard label="Identity verified" value={String(idCount("VERIFIED"))} icon={UserCheck} />
        <KpiCard label="Verification pending" value={String(idCount("PENDING"))} icon={ShieldCheck} />
        <KpiCard label="Email verified users" value={String(verifiedUsers)} icon={FileCheck} />
        <KpiCard label="Jurisdiction rules" value={String(jurisdictionRules.length)} icon={Globe} />
        <KpiCard label="Expiring/expired IDs" value={String(expiringOrExpired.length)} icon={CalendarClock} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-base">Needs manual review</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {pendingVerifications.length === 0 ? (
            <EmptyState icon={UserCheck} title="Nothing waiting on a human"
              description="Verifications the automated vendor couldn't decide on its own land here." />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Trainer</TableHead><TableHead>Submitted</TableHead><TableHead>Source</TableHead><TableHead>Images</TableHead>
                {canReview ? <TableHead></TableHead> : null}
              </TableRow></TableHeader>
              <TableBody>
                {pendingVerifications.map((v) => {
                  const failed = [
                    v.documentAuthentic === "FAIL" ? "Document" : null,
                    v.livenessPassed === "FAIL" ? "Liveness" : null,
                    v.faceMatchPassed === "FAIL" ? "Face match" : null,
                    v.duplicateCheckPassed === "FAIL" ? "Duplicate" : null,
                  ].filter(Boolean) as string[];
                  const isManual = v.provider === "manual";
                  const previews = previewsByUserId.get(v.userId);
                  return (
                    <TableRow key={v.id}>
                      <TableCell>{v.user.firstName} {v.user.lastName} <span className="text-muted-foreground">({v.user.email})</span></TableCell>
                      <TableCell className="text-xs text-muted-foreground">{v.submittedAt?.toLocaleDateString() ?? "—"}</TableCell>
                      <TableCell>
                        {isManual ? (
                          <Badge variant="secondary">Manual upload</Badge>
                        ) : (
                          <div className="flex flex-wrap gap-1">
                            {failed.length === 0 ? <Badge variant="outline">Vendor</Badge> : failed.map((f) => <Badge key={f} variant="warning">{f}</Badge>)}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        {isManual && previews ? (
                          <div className="flex gap-2">
                            {previews.documentUrl ? (
                              <a href={previews.documentUrl} target="_blank" rel="noreferrer" className="block">
                                {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived signed S3 URL, not an asset Next's optimizer can process */}
                                <img src={previews.documentUrl} alt="Uploaded ID" className="size-14 rounded-md border border-border object-cover" />
                              </a>
                            ) : null}
                            {previews.selfieUrl ? (
                              <a href={previews.selfieUrl} target="_blank" rel="noreferrer" className="block">
                                {/* eslint-disable-next-line @next/next/no-img-element -- a short-lived signed S3 URL, not an asset Next's optimizer can process */}
                                <img src={previews.selfieUrl} alt="Uploaded selfie" className="size-14 rounded-md border border-border object-cover" />
                              </a>
                            ) : null}
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      {canReview ? (
                        <TableCell className="text-right">
                          <IdentityReviewForm userId={v.userId} />
                        </TableCell>
                      ) : null}
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-base">Expiring & expired identity verifications</CardTitle></CardHeader>
        <CardContent className="pb-6">
          {expiringOrExpired.length === 0 ? (
            <EmptyState icon={CalendarClock} title="Nothing expiring"
              description="Verified trainers whose ID is expiring within 30 days, or has already expired, appear here." />
          ) : (
            <Table>
              <TableHeader><TableRow>
                <TableHead>Trainer</TableHead><TableHead>Expires</TableHead><TableHead>Status</TableHead>
              </TableRow></TableHeader>
              <TableBody>
                {expiringOrExpired.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell>{v.user.firstName} {v.user.lastName} <span className="text-muted-foreground">({v.user.email})</span></TableCell>
                    <TableCell className="text-sm">{v.expiresAt!.toLocaleDateString()}</TableCell>
                    <TableCell>
                      {v.expiryStatus === "expired" ? (
                        <Badge variant="destructive">Expired</Badge>
                      ) : (
                        <Badge variant="warning">{daysUntil(v.expiresAt!)} days left</Badge>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <div className="rounded-lg border border-border bg-muted/40 p-4 text-sm text-muted-foreground">
        <p className="font-medium text-foreground">Data handling</p>
        <p className="mt-1">
          Vendor-based verification stores decisions only — no document images, selfies, or biometric
          templates are retained. The one exception is manual-upload submissions above: those images
          are stored so a reviewer can look at them, and deleted automatically the moment a decision
          is recorded — never retained after review. Location data is coarse (country-level from IP)
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
