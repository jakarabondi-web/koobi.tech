"use client";

import Link from "next/link";
import { signOut } from "next-auth/react";
import { Sparkles, LogOut } from "lucide-react";

import { brand } from "@/config/brand";
import { Button } from "@/components/ui/button";

/**
 * The shell an applicant sees before approval.
 *
 * Deliberately not the portal shell: there is no sidebar, no search, no
 * notification bell. Someone part-way through an application has exactly
 * one thing to do next, and a navigation rail full of sections they cannot
 * open yet makes the product feel locked rather than in progress.
 *
 * Movement between steps comes from the stepper and the banner action on
 * the page itself, which always point at the next real step — so the flow
 * stays linear instead of asking someone to find their own way through it.
 */
export function ApplicantShell({
  userName,
  userEmail,
  children,
}: {
  userName: string;
  userEmail: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-surface">
      <header className="border-b border-border bg-background">
        <div className="mx-auto flex h-16 max-w-3xl items-center gap-3 px-4 sm:px-6">
          <Link href="/trainer/dashboard" className="flex items-center gap-2 font-semibold tracking-tight">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent-violet text-white">
              <Sparkles className="size-4" />
            </span>
            {brand.name}
          </Link>

          <div className="ml-auto flex items-center gap-3">
            <span className="hidden text-sm text-muted-foreground sm:inline">
              {userName || userEmail}
            </span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => signOut({ callbackUrl: "/" })}
              aria-label="Sign out"
            >
              <LogOut className="size-4" />
              <span className="hidden sm:inline">Sign out</span>
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-10 sm:px-6">{children}</main>
    </div>
  );
}
