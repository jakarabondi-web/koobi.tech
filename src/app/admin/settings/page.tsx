import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { CheckCircle2, AlertTriangle } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getIdentityProvider } from "@/lib/identity";
import { listPayoutProviders } from "@/lib/payments";
import { brand } from "@/config/brand";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TwoFactorSettings } from "@/components/shared/two-factor-settings";

export const metadata: Metadata = { title: "Platform settings" };

export default async function AdminSettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const me = await prisma.user.findUnique({ where: { id: session.user.id } });

  const identity = getIdentityProvider();
  const payouts = listPayoutProviders();
  const emailLive = Boolean(process.env.RESEND_API_KEY);
  const geoLive = Boolean(process.env.IPINFO_TOKEN);

  const integrations = [
    { name: "Email (Resend)", live: emailLive, note: emailLive ? "Sending live" : "Logs to console instead of sending" },
    { name: `Identity (${identity.label})`, live: !identity.isMocked(), note: identity.isMocked() ? "Simulating decisions" : "Live verification" },
    ...payouts.map((p) => ({ name: `Payouts — ${p.label}`, live: !p.isMocked(), note: p.isMocked() ? "Simulated, no money moves" : "Live transfers" })),
    { name: "IP geolocation", live: geoLive, note: geoLive ? "Live lookups" : "Returns empty results" },
  ];

  return (
    <div className="space-y-6">
      <PageHeader title="Platform settings" description="Brand configuration and integration status." />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Your account</CardTitle>
          <CardDescription>
            An administrator account is a high-value target — two-factor authentication is strongly
            recommended here.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pb-6 text-sm">
          <div className="flex items-center justify-between">
            <span className="text-muted-foreground">Email</span>
            <span>{me?.email}</span>
          </div>
          <TwoFactorSettings initiallyEnabled={me?.twoFactorEnabled ?? false} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Integrations</CardTitle>
          <CardDescription>
            Anything not live is running mocked. Set the matching environment variables to activate it —
            no code changes needed.
          </CardDescription>
        </CardHeader>
        <CardContent className="pb-6">
          <ul className="divide-y divide-border">
            {integrations.map((i) => (
              <li key={i.name} className="flex items-center justify-between gap-3 py-3">
                <div className="flex items-center gap-2.5">
                  {i.live
                    ? <CheckCircle2 className="size-4 text-success" />
                    : <AlertTriangle className="size-4 text-warning-foreground" />}
                  <div>
                    <p className="text-sm font-medium">{i.name}</p>
                    <p className="text-xs text-muted-foreground">{i.note}</p>
                  </div>
                </div>
                <Badge variant={i.live ? "success" : "warning"}>{i.live ? "Live" : "Mocked"}</Badge>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Brand</CardTitle>
          <CardDescription>Edit <code className="font-mono text-xs">src/config/brand.ts</code> to change these everywhere.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 pb-6 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Product name</span><span>{brand.name}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tagline</span><span>{brand.tagline}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Support email</span><span>{brand.supportEmail}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Sales email</span><span>{brand.salesEmail}</span></div>
        </CardContent>
      </Card>
    </div>
  );
}
