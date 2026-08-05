import type { Metadata } from "next";

import { brand } from "@/config/brand";
import { MarketingPageHero } from "@/components/marketing/page-hero";

export const metadata: Metadata = {
  title: "Privacy policy",
  description:
    "Traivr's privacy policy — how we collect, use, and protect the personal data of trainers, clients, and platform users.",
};

export default function PrivacyPage() {
  return (
    <>
      <MarketingPageHero eyebrow="Legal" title="Privacy policy" />
      <section className="py-16">
        <div className="mx-auto max-w-3xl space-y-4 px-4 text-sm text-muted-foreground sm:px-6 lg:px-8">
          <p>
            This page is a placeholder for {brand.legalName}&apos;s privacy policy. Replace this content with
            counsel-reviewed language before launch, covering data collection, use, retention, and your rights as a
            trainer, expert, or client user.
          </p>
          <p>Last updated: placeholder date.</p>
        </div>
      </section>
    </>
  );
}
