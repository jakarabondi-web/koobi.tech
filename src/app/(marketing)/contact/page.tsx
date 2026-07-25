import type { Metadata } from "next";

import { MarketingPageHero } from "@/components/marketing/page-hero";
import { ContactForm } from "@/components/marketing/contact-form";

export const metadata: Metadata = { title: "Contact sales" };

export default function ContactPage() {
  return (
    <>
      <MarketingPageHero
        eyebrow="Contact sales"
        title="Talk to our team"
        description="Tell us about your project and we'll follow up with a tailored plan and pricing."
      />
      <section className="py-16">
        <div className="mx-auto max-w-lg px-4 sm:px-6 lg:px-8">
          <ContactForm />
        </div>
      </section>
    </>
  );
}
