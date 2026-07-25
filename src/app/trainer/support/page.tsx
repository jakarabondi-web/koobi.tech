import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { LifeBuoy, BookOpen, CreditCard, ShieldQuestion, Wrench } from "lucide-react";

import { auth } from "@/lib/auth";
import { brand } from "@/config/brand";
import { PageHeader } from "@/components/shared/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { NewTicketForm } from "@/components/trainer/new-ticket-form";

export const metadata: Metadata = { title: "Help center" };

const TOPICS = [
  { icon: BookOpen, title: "Getting started", body: "Applications, assessments, and identity verification." },
  { icon: CreditCard, title: "Payments", body: "Wallet balances, payout timing, and payment methods." },
  { icon: ShieldQuestion, title: "Quality & reviews", body: "How work is reviewed and how to appeal a decision." },
  { icon: Wrench, title: "Technical issues", body: "Problems with the task workspace or your account." },
];

export default async function SupportPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Help center"
        description="Find an answer, or open a ticket and we'll get back to you."
        actions={<Button variant="outline" asChild><Link href="/trainer/support/tickets">My tickets</Link></Button>}
      />

      <div className="grid gap-4 sm:grid-cols-2">
        {TOPICS.map((t) => (
          <Card key={t.title}>
            <CardContent className="flex items-start gap-3 pt-5 pb-5">
              <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                <t.icon className="size-4.5" />
              </div>
              <div>
                <h3 className="text-sm font-semibold">{t.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{t.body}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="pt-6 pb-6">
          <div className="mb-4 flex items-center gap-2">
            <LifeBuoy className="size-4 text-primary" />
            <h2 className="text-sm font-semibold">Open a support ticket</h2>
          </div>
          <NewTicketForm />
          <p className="mt-4 text-xs text-muted-foreground">
            You can also email <a href={`mailto:${brand.supportEmail}`} className="text-primary hover:underline">{brand.supportEmail}</a>.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
