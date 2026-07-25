import type { Metadata } from "next";
import Link from "next/link";
import { CheckCircle2, XCircle, Clock } from "lucide-react";

import { verifyEmailToken } from "@/server/services/email-verification";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Verify email" };

const COPY = {
  verified: {
    icon: CheckCircle2,
    tone: "text-success",
    title: "Email confirmed",
    body: "Your account is now active. Sign in to get started.",
  },
  already_verified: {
    icon: CheckCircle2,
    tone: "text-success",
    title: "Already confirmed",
    body: "This email address was already verified. You can sign in.",
  },
  expired: {
    icon: Clock,
    tone: "text-warning",
    title: "Link expired",
    body: "Verification links are valid for 24 hours. Request a new one from the sign-in page.",
  },
  invalid: {
    icon: XCircle,
    tone: "text-destructive",
    title: "Invalid link",
    body: "We couldn't match that verification link to an account. Check the link, or request a new one.",
  },
} as const;

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const result = token ? await verifyEmailToken(token) : "invalid";
  const copy = COPY[result];
  const Icon = copy.icon;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader className="items-center text-center">
        <Icon className={`size-8 ${copy.tone}`} />
        <CardTitle className="text-xl">{copy.title}</CardTitle>
        <CardDescription>{copy.body}</CardDescription>
      </CardHeader>
      <CardContent className="pb-6">
        <Button asChild className="w-full">
          <Link href="/login">Go to sign in</Link>
        </Button>
      </CardContent>
    </Card>
  );
}
