import Link from "next/link";
import { Sparkles } from "lucide-react";

import { brand } from "@/config/brand";

const COLUMNS: Array<{ title: string; links: Array<{ href: string; label: string }> }> = [
  {
    title: "Product",
    links: [
      { href: "/services", label: "Solutions" },
      { href: "/security", label: "Security" },
      { href: "/pricing", label: "Pricing" },
      { href: "/resources", label: "Resources" },
    ],
  },
  {
    title: "Solutions",
    links: [
      { href: "/for-companies", label: "For AI companies" },
      { href: "/for-experts", label: "For experts" },
      { href: "/apply", label: "Apply as an expert" },
    ],
  },
  {
    title: "Company",
    links: [
      { href: "/about", label: "About" },
      { href: "/contact", label: "Contact sales" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/privacy", label: "Privacy" },
      { href: "/legal/terms", label: "Terms" },
      { href: "/legal/cookies", label: "Cookie preferences" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-surface">
      <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 lg:px-8">
        <div className="grid grid-cols-2 gap-8 md:grid-cols-6">
          <div className="col-span-2">
            <Link href="/" className="flex items-center gap-2 font-semibold tracking-tight">
              <span className="flex size-7 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent-violet text-white">
                <Sparkles className="size-3.5" />
              </span>
              {brand.name}
            </Link>
            <p className="mt-3 max-w-xs text-sm text-muted-foreground">{brand.tagline}</p>
          </div>
          {COLUMNS.map((col) => (
            <div key={col.title}>
              <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{col.title}</p>
              <ul className="mt-3 space-y-2">
                {col.links.map((link) => (
                  <li key={link.href}>
                    <Link href={link.href} className="text-sm text-muted-foreground hover:text-foreground">
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
        <div className="mt-10 flex flex-col gap-4 border-t border-border pt-6 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            © {new Date().getFullYear()} {brand.legalName}. All rights reserved.
          </p>
          <div className="flex gap-4 text-xs text-muted-foreground">
            <a href={brand.social.linkedin} className="hover:text-foreground">
              LinkedIn
            </a>
            <a href={brand.social.twitter} className="hover:text-foreground">
              X / Twitter
            </a>
          </div>
        </div>
      </div>
    </footer>
  );
}
