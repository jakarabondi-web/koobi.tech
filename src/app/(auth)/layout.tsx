import Link from "next/link";

import { brand } from "@/config/brand";
import { NeuralMesh } from "@/components/shared/neural-mesh";
import { LogoMark } from "@/components/shared/logo-mark";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-surface via-background to-background">
      {/* Same live mesh as the homepage hero — sign-in and sign-up used to
          be flat white pages with none of the site's visual identity.
          Light tone to match the lightened background. */}
      <NeuralMesh density={0.00014} maxNodes={70} linkDistance={120} fade="down" tone="light" opacity={0.8} />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,color-mix(in_oklch,var(--primary)_10%,transparent),transparent_55%)]" />

      <header className="relative border-b border-border">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-foreground">
            <LogoMark size={32} priority />
            {brand.name}
          </Link>
        </div>
      </header>
      <main className="relative flex flex-1 items-center justify-center px-4 py-12">{children}</main>
    </div>
  );
}
