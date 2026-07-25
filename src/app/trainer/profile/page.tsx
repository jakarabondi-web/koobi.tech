import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck, MapPin, Clock } from "lucide-react";

import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db/prisma";
import { getTrainerGate } from "@/server/services/trainer-gate";
import { PageHeader } from "@/components/shared/page-header";
import { GateBanner } from "@/components/trainer/gate-banner";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { StatusBadge } from "@/components/ui/badge-status";

export const metadata: Metadata = { title: "Profile" };

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  const userId = session.user.id;

  const [profile, application, identity, skills, languages, gate] = await Promise.all([
    prisma.trainerProfile.findUnique({ where: { userId } }),
    prisma.application.findUnique({ where: { userId } }),
    prisma.identityVerification.findUnique({ where: { userId } }),
    prisma.userSkill.findMany({ where: { trainer: { userId } }, include: { skill: true } }),
    prisma.userLanguage.findMany({ where: { trainer: { userId } }, include: { language: true } }),
    getTrainerGate(userId),
  ]);

  const initials = (session.user.name ?? "T").split(" ").map((p) => p[0]).join("").slice(0, 2).toUpperCase();

  return (
    <div className="space-y-6">
      <PageHeader title="Your profile" description="What clients and reviewers see about your expertise." />
      <GateBanner gate={gate} />

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader><CardTitle className="text-base">About you</CardTitle></CardHeader>
          <CardContent className="space-y-4 pb-6">
            <div className="flex items-center gap-4">
              <Avatar className="size-14"><AvatarFallback className="text-base">{initials}</AvatarFallback></Avatar>
              <div>
                <p className="font-semibold">{session.user.name}</p>
                <p className="text-sm text-muted-foreground">{session.user.email}</p>
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Headline</p>
              <p className="mt-1 text-sm">{profile?.headline ?? "Not set yet."}</p>
            </div>
            <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5"><MapPin className="size-4" />{profile?.country ?? "—"}</span>
              <span className="flex items-center gap-1.5"><Clock className="size-4" />{profile?.availableHoursPerWeek ?? "—"} hrs/week</span>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Skills</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {skills.length ? skills.map((s) => <Badge key={s.id} variant="secondary">{s.skill.name}</Badge>)
                  : <p className="text-sm text-muted-foreground">None added yet.</p>}
              </div>
            </div>
            <div>
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Languages</p>
              <div className="mt-1.5 flex flex-wrap gap-1.5">
                {languages.length ? languages.map((l) => (
                  <Badge key={l.id} variant="outline">{l.language.name} · {l.proficiency.toLowerCase()}</Badge>
                )) : <p className="text-sm text-muted-foreground">None added yet.</p>}
              </div>
            </div>
            <Button variant="outline" size="sm" asChild><Link href="/trainer/onboarding">Edit application details</Link></Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader><CardTitle className="text-base">Account standing</CardTitle></CardHeader>
          <CardContent className="space-y-3 pb-6 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Application</span>
              {application ? <StatusBadge status={application.status} /> : <Badge variant="outline">Not started</Badge>}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Identity</span>
              {identity ? <StatusBadge status={identity.status} /> : <Badge variant="outline">Not started</Badge>}
            </div>
            <div className="flex items-center justify-between">
              <span className="text-muted-foreground">Quality score</span>
              <span className="font-medium">{profile?.qualityScore ? `${Math.round(profile.qualityScore * 100)}%` : "—"}</span>
            </div>
            {identity?.status !== "VERIFIED" ? (
              <Button variant="violet" size="sm" className="w-full" asChild>
                <Link href="/trainer/verification"><ShieldCheck className="size-4" /> Verify identity</Link>
              </Button>
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
