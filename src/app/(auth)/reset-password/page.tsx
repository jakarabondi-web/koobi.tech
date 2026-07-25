import type { Metadata } from "next";

import { ResetPasswordForm } from "@/components/marketing/reset-password-form";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

export const metadata: Metadata = { title: "Reset password" };

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;

  return (
    <Card className="w-full max-w-sm">
      <CardHeader>
        <CardTitle className="text-xl">Choose a new password</CardTitle>
        <CardDescription>Use at least 8 characters.</CardDescription>
      </CardHeader>
      <CardContent className="pb-6">
        {token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <p className="text-sm text-destructive">Missing reset token. Request a new link.</p>
        )}
      </CardContent>
    </Card>
  );
}
