import type { Metadata } from "next";
import Link from "next/link";

import { SsoComplete } from "@/components/marketing/sso-complete";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Signing in" };

export default async function SsoCompletePage({
  searchParams,
}: {
  searchParams: Promise<{ ticket?: string }>;
}) {
  const { ticket } = await searchParams;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Single sign-on</CardTitle>
        <CardDescription>Your identity provider verified you.</CardDescription>
      </CardHeader>
      <CardContent className="pb-6">
        {ticket ? (
          <SsoComplete ticket={ticket} />
        ) : (
          <p className="text-sm text-muted-foreground">
            This page needs a sign-in ticket.{" "}
            <Link href="/login" className="font-medium text-primary hover:underline">
              Start again
            </Link>
            .
          </p>
        )}
      </CardContent>
    </Card>
  );
}
