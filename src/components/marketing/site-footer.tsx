import Link from "next/link";

import { Logo } from "@/components/brand/logo";

const FOOTER_LINKS = [
  {
    title: "Platform",
    links: [
      { label: "Data creation", href: "#platform" },
      { label: "Model evaluation", href: "#platform" },
      { label: "Quality controls", href: "#quality" },
      { label: "Expert network", href: "#network" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "#resources" },
      { label: "Careers", href: "#resources" },
      { label: "Security", href: "#security" },
      { label: "Contact", href: "#contact" },
    ],
  },
  {
    title: "Product",
    links: [
      { label: "Admin console", href: "/admin" },
      { label: "Expert dashboard", href: "/dashboard" },
      { label: "Documentation", href: "#resources" },
      { label: "Status", href: "#resources" },
    ],
  },
];

export function SiteFooter() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="mx-auto w-full max-w-content px-4 py-12 sm:px-6">
        <div className="grid gap-10 lg:grid-cols-[1.5fr_repeat(3,1fr)]">
          <div>
            <Logo />
            <p className="mt-4 max-w-xs text-sm text-muted-foreground">
              The human intelligence layer for AI — verified experts who create,
              evaluate, and improve frontier model data.
            </p>
          </div>

          {FOOTER_LINKS.map((column) => (
            <div key={column.title}>
              <h2 className="text-sm font-semibold">{column.title}</h2>
              <ul className="mt-4 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="mt-10 flex flex-col gap-2 border-t border-border pt-6 text-xs text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p>© {new Date().getFullYear()} Trainora AI. All rights reserved.</p>
          <p>Enterprise security · SOC 2 · GDPR</p>
        </div>
      </div>
    </footer>
  );
}
