import type { Metadata } from "next";
import Link from "next/link";

import { TwoFactorChallengeForm } from "@/components/marketing/two-factor-challenge-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Two-factor authentication" };

export default async function VerifyTwoFactorPage({
  searchParams,
}: {
  searchParams: Promise<{ challenge?: string }>;
}) {
  const { challenge } = await searchParams;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Two-factor authentication</CardTitle>
        <CardDescription>Enter the code from your authenticator app.</CardDescription>
      </CardHeader>
      <CardContent className="pb-6">
        {challenge ? (
          <TwoFactorChallengeForm challenge={challenge} />
        ) : (
          <p className="text-sm text-muted-foreground">
            This page needs a challenge.{" "}
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
