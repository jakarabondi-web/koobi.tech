import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";

import { auth } from "@/lib/auth";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { VerificationRefresher } from "@/components/trainer/verification-panel";

export const metadata: Metadata = { title: "Verification (simulated)" };

/**
 * Stands in for the vendor-hosted capture screen while no provider is
 * configured. A real deployment redirects to the vendor's own origin and
 * never renders capture UI here.
 */
export default async function SimulatePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <PageHeader title="Verification capture" description="Simulated provider screen" />
      <Card>
        <CardContent className="space-y-5 py-8 text-center">
          <ShieldCheck className="mx-auto size-10 text-primary" />
          <div className="space-y-1.5">
            <p className="text-sm font-medium">This is a simulated capture step</p>
            <p className="text-sm text-muted-foreground">
              With a provider configured, you&apos;d be on their hosted flow here — photographing your
              ID and recording a short liveness video. Nothing is captured in this simulation.
            </p>
          </div>
          <div className="flex justify-center">
            <VerificationRefresher />
          </div>
          <p className="text-xs text-muted-foreground">
            Press &ldquo;Check status&rdquo; to pull the simulated decision and continue.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
