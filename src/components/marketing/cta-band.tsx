import Link from "next/link";

import { Button } from "@/components/ui/button";

export function CtaBand() {
  return (
    <section
      id="contact"
      aria-labelledby="cta-title"
      className="mx-auto w-full max-w-content scroll-mt-20 px-4 pb-20 sm:px-6"
    >
      <div className="flex flex-col gap-6 rounded-lg border border-border bg-muted/40 px-6 py-10 sm:px-10 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <h2 id="cta-title" className="text-2xl font-bold tracking-tight sm:text-3xl">
            Ready to build better AI with human expertise?
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Tell us about your project and we&apos;ll help you get started.
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap gap-3">
          <Link href="/admin">
            <Button size="lg">Start a project</Button>
          </Link>
          <Link href="/dashboard">
            <Button size="lg" variant="outline">
              Talk to sales
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
