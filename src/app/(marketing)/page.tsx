import Link from "next/link";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ShieldCheck,
  ScanEye,
  GitCompareArrows,
  ListOrdered,
  PenLine,
  Languages,
  Code2,
  FlaskConical,
  Scale,
  Stethoscope,
  Calculator,
  BookOpenText,
  Landmark,
  CheckCircle2,
  Lock,
  KeyRound,
  FileClock,
  Building2,
  BadgeCheck,
  Wallet,
  MessageSquareQuote,
  Globe2,
} from "lucide-react";

import { brand } from "@/config/brand";
import { auth } from "@/lib/auth";
import { dashboardPathForSurface } from "@/lib/permissions/roles";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { InteractiveHero } from "@/components/marketing/interactive-hero";
import { NeuralMesh } from "@/components/shared/neural-mesh";
import { WorldNetworkMap } from "@/components/shared/world-network-map";
import { RegistrationSteps } from "@/components/marketing/registration-steps";

export const metadata: Metadata = {
  // `absolute` opts out of the root layout's "%s · Traivr" template, which
  // would otherwise append the brand name to a title that already opens with
  // it.
  title: { absolute: `${brand.name} — Train better AI with verified human expertise` },
};

const SERVICES = [
  { icon: GitCompareArrows, title: "RLHF & preference data", desc: "Pairwise and multi-response ranking to build reward models trainers can trust." },
  { icon: PenLine, title: "Supervised fine-tuning", desc: "Ideal-response writing and prompt creation from vetted domain experts." },
  { icon: ScanEye, title: "Model evaluations", desc: "Structured, rubric-based scoring across correctness, safety, and tone." },
  { icon: ShieldCheck, title: "Red teaming", desc: "Adversarial probing and policy testing from trained safety specialists." },
  { icon: BookOpenText, title: "Expert data creation", desc: "Original prompts, references, and worked examples in specialist domains." },
  { icon: Languages, title: "Multilingual evaluation", desc: "Native-fluency review across dozens of languages and locales." },
  { icon: Code2, title: "Code & reasoning tasks", desc: "Code review, output evaluation, and multi-step reasoning checks." },
  { icon: FlaskConical, title: "Safety & policy testing", desc: "Classification and hallucination detection against your policy rubric." },
];

const EXPERT_CATEGORIES = [
  { icon: Code2, label: "Software engineers" },
  { icon: Calculator, label: "Mathematicians" },
  { icon: FlaskConical, label: "Scientists" },
  { icon: Scale, label: "Legal experts" },
  { icon: Stethoscope, label: "Medical experts" },
  { icon: Landmark, label: "Finance professionals" },
  { icon: Languages, label: "Linguists" },
  { icon: BookOpenText, label: "Researchers" },
];

const CLIENT_STEPS = [
  { title: "Define the project", desc: "Set your task type, rubric, domain, and quality bar in the project wizard." },
  { title: "Match with verified experts", desc: "Our matching engine pairs your project with qualified, available specialists." },
  { title: "Collect and review data", desc: "Multi-stage review, consensus scoring, and adjudication keep quality high." },
  { title: "Export production-ready results", desc: "Download or stream client-ready datasets through the API." },
];

const QUALITY_POINTS = [
  { icon: BadgeCheck, title: "Qualification testing", desc: "Every trainer passes domain assessments before touching live tasks." },
  { icon: FileClock, title: "Gold-standard tasks", desc: "Hidden benchmark tasks continuously calibrate accuracy." },
  { icon: ScanEye, title: "Multi-stage review", desc: "Reviewers and lead reviewers check submissions before they ship." },
  { icon: ListOrdered, title: "Consensus scoring", desc: "Duplicate assignments surface disagreement automatically." },
  { icon: ShieldCheck, title: "Anomaly detection", desc: "Automated signals flag unusual patterns for human follow-up." },
  { icon: Scale, title: "Human adjudication", desc: "Lead reviewers resolve edge cases — never a fully automated call." },
];

const SECURITY_POINTS = [
  { icon: Lock, title: "Role-based access", desc: "Granular, server-enforced permissions across every surface." },
  { icon: KeyRound, title: "Encryption", desc: "Data encrypted in transit and at rest, with encrypted sensitive fields." },
  { icon: FileClock, title: "Audit logging", desc: "Every sensitive action is recorded with actor, target, and timestamp." },
  { icon: Building2, title: "Project isolation", desc: "Tenant data is isolated per organization by default." },
  { icon: ShieldCheck, title: "Secure workspaces", desc: "Task content is scoped to assigned, qualified workers only." },
  { icon: CheckCircle2, title: "Designed for SOC 2 readiness", desc: "Built around SOC 2-aligned controls as we pursue formal certification." },
];

const TRAINER_BENEFITS = [
  "Flexible projects you choose, on your schedule",
  "Transparent pay shown before you start any task",
  "Domain-specific work matched to your expertise",
  "Quality bonuses for consistently strong submissions",
  "Clear, actionable feedback from senior reviewers",
  "Reliable, on-time payments with full history",
];

const SAMPLE_CLIENTS = ["Northwind Labs", "Meridian AI", "Solace Systems", "Anchorpoint", "Vantage Models", "Cobalt Research"];

export default async function HomePage() {
  // OAuth and SSO sign-ins land here (they redirect to "/"), and this
  // marketing page has no way to show a signed-in state — so a successful
  // sign-in would otherwise look identical to never having signed in at
  // all. Send anyone with a session straight to their dashboard instead —
  // but only when they actually have a role to send them to. A session
  // with no recognized role redirecting into a surface it can't access
  // would bounce straight to /403 with no way back; showing the ordinary
  // marketing page is the safe fallback for that edge case.
  const session = await auth();
  if (session?.user?.surface) {
    redirect(dashboardPathForSurface(session.user.surface));
  }

  return (
    <>
      {/* Hero */}
      <section className="relative overflow-hidden border-b border-border bg-gradient-to-b from-surface via-background to-background">
        {/* Live neural mesh — the network of experts feeding a model, made
            literal. Light tone: same blue hue range as the dark version
            elsewhere, pulled darker so it holds up against this background. */}
        <NeuralMesh density={0.00016} maxNodes={95} linkDistance={132} tone="light" opacity={0.8} />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_25%_0%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_60%)]" />
        <div className="relative mx-auto grid max-w-7xl gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8 lg:py-28">
          <div>
            <Badge variant="outline" className="border-primary/25 bg-primary/5 text-primary">
              Human expertise for better AI
            </Badge>
            <h1 className="mt-5 text-4xl font-bold tracking-tight text-foreground sm:text-5xl lg:text-6xl">
              Train better AI with verified human expertise.
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground">
              {brand.name} connects leading AI teams with carefully vetted specialists who create, evaluate, and
              improve high-quality training data.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button size="lg" variant="violet" asChild>
                <Link href="/contact">
                  Book a demo <ArrowRight className="size-4" />
                </Link>
              </Button>
              <Button size="lg" variant="outline" asChild>
                <Link href="/apply">Become an AI trainer</Link>
              </Button>
            </div>
          </div>

          {/* Live, playable miniature of the actual task workflow — its own
              stat row already covers tasks/experts/agreement, so the hero
              doesn't need a second copy of the same numbers next to it. */}
          <div className="mx-auto w-full max-w-md">
            <InteractiveHero />
          </div>
        </div>
      </section>

      {/* Trust */}
      <section className="border-b border-border py-12">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <p className="text-center font-mono text-[11px] uppercase tracking-widest text-muted-foreground">
            Built for teams developing the next generation of AI
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-10 gap-y-4 opacity-70">
            {SAMPLE_CLIENTS.map((name) => (
              <span key={name} className="text-sm font-semibold tracking-wide text-muted-foreground">
                {name}
              </span>
            ))}
          </div>
          <p className="mt-4 text-center text-xs text-muted-foreground">
            Sample client names shown for illustration only.
          </p>
        </div>
      </section>

      {/* What Traivr does — the full pipeline, numbered like the stages it is */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <span className="font-mono text-xs uppercase tracking-widest text-primary">01 · What we do</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Every stage of the data pipeline, covered
            </h2>
            <p className="mt-3 text-muted-foreground">
              From raw prompt generation to production-ready datasets, run the full lifecycle of human-in-the-loop AI
              training on one platform.
            </p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {SERVICES.map((s, i) => (
              <Card key={s.title} className="relative overflow-hidden">
                <span className="absolute right-4 top-4 font-mono text-xs text-muted-foreground/50">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <CardContent className="pt-1 pb-5">
                  <div className="flex size-9 items-center justify-center rounded-lg bg-accent text-accent-foreground">
                    <s.icon className="size-4.5" />
                  </div>
                  <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* How it works for AI companies */}
      <section className="border-y border-border bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">02 · For AI companies</span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">How it works for clients</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {CLIENT_STEPS.map((step, i) => (
              <div key={step.title} className="relative">
                <div className="flex size-9 items-center justify-center rounded-full bg-primary font-mono text-sm font-semibold text-primary-foreground">
                  {i + 1}
                </div>
                <h3 className="mt-4 text-sm font-semibold">{step.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{step.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How registration works — the real applicant flow, made visible */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid gap-12 lg:grid-cols-[1fr_1.4fr] lg:gap-16">
            <div>
              <span className="font-mono text-xs uppercase tracking-widest text-primary">03 · For experts</span>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                From sign-up to your first paid task
              </h2>
              <p className="mt-4 max-w-md text-muted-foreground">
                Five steps, start to finish — the same ones you&apos;ll see progress through once you&apos;re
                signed in, not a simplified marketing version of them.
              </p>
              <Button size="lg" variant="violet" className="mt-6" asChild>
                <Link href="/apply">
                  Start your application <ArrowRight className="size-4" />
                </Link>
              </Button>
            </div>
            <RegistrationSteps />
          </div>
        </div>
      </section>

      {/* Expert network — the world map again, this time as the subject
          of the section rather than hero backdrop. */}
      <section className="relative overflow-hidden border-b border-border bg-surface py-20">
        <WorldNetworkMap opacity={0.55} tone="light" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_20%,color-mix(in_oklch,var(--primary)_8%,transparent),transparent_55%)]" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="flex items-center gap-2 font-mono text-xs uppercase tracking-widest text-primary">
                <Globe2 className="size-3.5" /> 04 · Global network
              </span>
              <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
                A verified network across every domain
              </h2>
              <p className="mt-3 max-w-xl text-muted-foreground">
                Trainers and experts are vetted through identity checks and domain assessments before working on
                live projects.
              </p>
            </div>
            <Button variant="outline" asChild>
              <Link href="/for-companies">Explore the expert network</Link>
            </Button>
          </div>
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
            {EXPERT_CATEGORIES.map((c) => (
              <div
                key={c.label}
                className="flex flex-col items-center gap-2 rounded-xl border border-border bg-card p-6 text-center"
              >
                <c.icon className="size-5 text-primary" />
                <span className="text-sm font-medium">{c.label}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Quality */}
      <section className="py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <span className="font-mono text-xs uppercase tracking-widest text-accent-violet">05 · Quality control</span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">Quality is the product</h2>
          <p className="mt-3 max-w-2xl text-muted-foreground">
            Every dataset moves through a structured pipeline before it reaches you — never a single unreviewed
            submission.
          </p>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {QUALITY_POINTS.map((q) => (
              <div key={q.title} className="rounded-xl border border-border bg-card p-5">
                <q.icon className="size-5 text-accent-violet" />
                <h3 className="mt-3 text-sm font-semibold">{q.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{q.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security */}
      <section className="border-y border-border bg-surface py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <span className="font-mono text-xs uppercase tracking-widest text-primary">06 · Security</span>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
            Enterprise-grade security by default
          </h2>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {SECURITY_POINTS.map((s) => (
              <div key={s.title} className="rounded-xl border border-border bg-card p-5">
                <s.icon className="size-5 text-primary" />
                <h3 className="mt-3 text-sm font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-sm text-muted-foreground">{s.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Trainer section */}
      <section className="border-y border-border py-20">
        <div className="mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-2 lg:items-center lg:px-8">
          <div>
            <span className="font-mono text-xs uppercase tracking-widest text-primary">07 · For experts</span>
            <h2 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
              Get paid to improve the world&apos;s most advanced AI systems.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Join a network of specialists doing meaningful, well-compensated work that shapes how AI systems
              behave.
            </p>
            <Button size="lg" variant="violet" className="mt-6" asChild>
              <Link href="/apply">
                Apply as an expert <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
          <ul className="grid gap-3 sm:grid-cols-2">
            {TRAINER_BENEFITS.map((b) => (
              <li key={b} className="flex items-start gap-2 rounded-lg border border-border bg-card p-3 text-sm">
                <Wallet className="mt-0.5 size-4 shrink-0 text-primary" />
                {b}
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-20">
        <div className="mx-auto max-w-4xl px-4 text-center sm:px-6 lg:px-8">
          <MessageSquareQuote className="mx-auto size-8 text-accent-violet" />
          <h2 className="mt-4 text-3xl font-semibold tracking-tight">
            Ready to build a higher-quality training data pipeline?
          </h2>
          <p className="mt-3 text-muted-foreground">
            Talk to our team about your evaluation, RLHF, or red-teaming needs.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <Button size="lg" variant="violet" asChild>
              <Link href="/contact">Book a demo</Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="/apply">Become an AI trainer</Link>
            </Button>
          </div>
        </div>
      </section>
    </>
  );
}
