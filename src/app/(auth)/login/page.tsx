import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "@/components/marketing/login-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string; for?: string }>;
}) {
  const { callbackUrl, for: forSurface } = await searchParams;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>
          {forSurface
            ? `Sign in to access the ${forSurface} portal.`
            : "Sign in to your Trainora AI account."}
        </CardDescription>
      </CardHeader>
      <CardContent className="pb-6">
        <LoginForm callbackUrl={callbackUrl} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/register" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <Link href="/forgot-password" className="text-muted-foreground hover:underline">
            Forgot your password?
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
