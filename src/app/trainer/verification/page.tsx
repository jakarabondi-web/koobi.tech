import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck, CheckCircle2, XCircle, Clock } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getIdentityProvider } from "@/lib/identity";
import { isStorageConfigured } from "@/lib/storage/s3";
import { credentialExpiryStatus, daysUntil } from "@/lib/utils/credential-expiry";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  VerificationStarter,
  VerificationRefresher,
  ManualVerificationUpload,
} from "@/components/trainer/verification-panel";

export const metadata: Metadata = { title: "Identity verification" };

const CHECKS = [
  ["documentAuthentic", "Document authenticity"],
  ["livenessPassed", "Liveness (physically present)"],
  ["faceMatchPassed", "Face matches document"],
  ["duplicateCheckPassed", "No duplicate account"],
] as const;

export default async function VerificationPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const record = await prisma.identityVerification.findUnique({ where: { userId: session.user.id } });
  const provider = getIdentityProvider();
  const mocked = provider.isMocked();
  const manualAvailable = isStorageConfigured();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <PageHeader
        title="Identity verification"
        description="We verify every trainer's identity before they access client work."
      />

      {mocked ? (
        <div className="rounded-lg border border-warning/50 bg-warning/10 p-4 text-sm">
          <p className="font-medium">{manualAvailable ? "Automated verification unavailable" : "Simulated verification"}</p>
          <p className="text-muted-foreground">
            {manualAvailable
              ? "No automated verification provider is configured. Use \"Start verification\" for a simulated automatic decision, or upload documents below for a team member to review by hand."
              : "No verification provider is configured, so this flow simulates a decision end to end. No documents are captured or transmitted."}
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-5 pb-6">
          <div className="flex items-center gap-3">
            {record?.status === "VERIFIED" ? (
              <><CheckCircle2 className="size-5 text-success" /><Badge variant="success">Verified</Badge></>
            ) : record?.status === "FAILED" ? (
              <><XCircle className="size-5 text-destructive" /><Badge variant="destructive">Not verified</Badge></>
            ) : record?.status === "PENDING" ? (
              <><Clock className="size-5 text-muted-foreground" /><Badge variant="info">In progress</Badge></>
            ) : (
              <><ShieldCheck className="size-5 text-muted-foreground" /><Badge variant="outline">Not started</Badge></>
            )}
          </div>

          {record && record.status !== "NOT_STARTED" ? (
            <ul className="space-y-2">
              {CHECKS.map(([key, label]) => {
                const v = record[key];
                return (
                  <li key={key} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{label}</span>
                    <Badge variant={v === "PASS" ? "success" : v === "FAIL" ? "destructive" : "outline"}>
                      {v ? v.toLowerCase() : "pending"}
                    </Badge>
                  </li>
                );
              })}
            </ul>
          ) : null}

          {record?.notes ? <p className="text-sm text-muted-foreground">{record.notes}</p> : null}

          {record?.status === "VERIFIED" ? (
            (() => {
              const expiry = credentialExpiryStatus(record.expiresAt);
              if (expiry === "expired") {
                return (
                  <div className="space-y-3">
                    <p className="text-sm text-destructive">
                      Your verification expired{record.expiresAt ? ` on ${record.expiresAt.toLocaleDateString()}` : ""}.
                      Re-verify to keep working on client tasks.
                    </p>
                    <VerificationStarter />
                  </div>
                );
              }
              if (expiry === "expiring_soon" && record.expiresAt) {
                return (
                  <p className="text-sm text-warning-foreground">
                    Your verification expires in {daysUntil(record.expiresAt)} days
                    ({record.expiresAt.toLocaleDateString()}). We&apos;ll prompt you to re-verify before then.
                  </p>
                );
              }
              return (
                <p className="text-sm text-success">
                  Your identity is verified. Nothing further is needed.
                </p>
              );
            })()
          ) : record?.status === "PENDING" && record.provider === "manual" ? (
            <p className="text-sm text-muted-foreground">
              Submitted for manual review. We&apos;ll email you once a team member has looked at it —
              typically within a few business days.
            </p>
          ) : record?.status === "PENDING" ? (
            <VerificationRefresher />
          ) : (
            <VerificationStarter />
          )}
        </CardContent>
      </Card>

      {mocked && manualAvailable && record?.status !== "PENDING" && record?.status !== "VERIFIED" ? (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Or verify manually</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <ManualVerificationUpload />
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
