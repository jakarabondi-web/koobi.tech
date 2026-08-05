import type { Metadata } from "next";

import { brand } from "@/config/brand";
import { MarketingPageHero } from "@/components/marketing/page-hero";

export const metadata: Metadata = {
  title: "Terms of service",
  description: "Traivr's terms of service — the terms governing use of the Traivr platform by AI companies and trainers.",
};

export default function TermsPage() {
  return (
    <>
      <MarketingPageHero eyebrow="Legal" title="Terms of service" />
      <section className="py-16">
        <div className="mx-auto max-w-3xl space-y-4 px-4 text-sm text-muted-foreground sm:px-6 lg:px-8">
          <p>
            This page is a placeholder for {brand.legalName}&apos;s terms of service. Replace this content with
            counsel-reviewed language before launch, covering platform use, trainer agreements, client agreements,
            and payment terms.
          </p>
          <p>Last updated: placeholder date.</p>
        </div>
      </section>
    </>
  );
}
