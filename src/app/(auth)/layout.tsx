import Link from "next/link";
import { Sparkles } from "lucide-react";

import { brand } from "@/config/brand";
import { NeuralMesh } from "@/components/shared/neural-mesh";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gradient-to-b from-navy via-navy to-background">
      {/* Same live mesh as the homepage hero — sign-in and sign-up used to
          be flat white pages with none of the site's visual identity. */}
      <NeuralMesh density={0.00014} maxNodes={70} linkDistance={120} fade="down" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_-10%,color-mix(in_oklch,var(--accent-violet)_35%,transparent),transparent_55%)]" />

      <header className="relative border-b border-white/10">
        <div className="mx-auto flex h-16 max-w-7xl items-center px-4 sm:px-6 lg:px-8">
          <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight text-white">
            <span className="flex size-8 items-center justify-center rounded-lg bg-gradient-brand text-white shadow-glow-brand">
              <Sparkles className="size-4" />
            </span>
            {brand.name}
          </Link>
        </div>
      </header>
      <main className="relative flex flex-1 items-center justify-center px-4 py-12">{children}</main>
    </div>
  );
}
