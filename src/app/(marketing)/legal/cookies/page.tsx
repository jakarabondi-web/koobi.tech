import type { Metadata } from "next";

import { brand } from "@/config/brand";
import { MarketingPageHero } from "@/components/marketing/page-hero";

export const metadata: Metadata = { title: "Cookie preferences" };

export default function CookiesPage() {
  return (
    <>
      <MarketingPageHero eyebrow="Legal" title="Cookie preferences" />
      <section className="py-16">
        <div className="mx-auto max-w-3xl space-y-4 px-4 text-sm text-muted-foreground sm:px-6 lg:px-8">
          <p>
            This page is a placeholder for {brand.legalName}&apos;s cookie policy and preference center. Replace with
            a real consent-management integration before launch.
          </p>
        </div>
      </section>
    </>
  );
}
