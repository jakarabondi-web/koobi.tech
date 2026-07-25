import { CtaBand } from "@/components/marketing/cta-band";
import { Features } from "@/components/marketing/features";
import { GlobalNetwork } from "@/components/marketing/global-network";
import { Hero } from "@/components/marketing/hero";
import { LogoCloud } from "@/components/marketing/logo-cloud";
import { SiteFooter } from "@/components/marketing/site-footer";
import { SiteHeader } from "@/components/marketing/site-header";
import { StatsBand } from "@/components/marketing/stats-band";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <main>
        <Hero />
        <LogoCloud />
        <StatsBand />
        <Features />
        <GlobalNetwork />
        <CtaBand />
      </main>
      <SiteFooter />
    </div>
  );
}
