import type { Metadata } from "next";
import { Plus_Jakarta_Sans, Geist_Mono } from "next/font/google";
import { Toaster } from "sonner";

import "./globals.css";
import { brand } from "@/config/brand";
import { ThemeProvider } from "@/components/shared/theme-provider";
import { QueryProvider } from "@/components/shared/query-provider";
import { AuthSessionProvider } from "@/components/shared/session-provider";

// A warmer, more distinctive geometric sans than the previous Geist —
// still restrained enough for an enterprise-facing product, but with more
// character in its curves. Mono stays Geist Mono for the small uppercase
// labels and stat figures scattered through the marketing pages.
const sans = Plus_Jakarta_Sans({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const description = `${brand.name} connects verified AI trainers, subject-matter experts, and reviewers with AI companies that need high-quality training data, human feedback, and model evaluations.`;

export const metadata: Metadata = {
  // Absolute-URL base for the generated opengraph-image route — link
  // previews (WhatsApp, iMessage, X, Slack, LinkedIn) need absolute image
  // URLs, and every page inherits this.
  metadataBase: new URL(`https://${brand.domain}`),
  title: {
    default: `${brand.name} — ${brand.tagline}`,
    template: `%s · ${brand.name}`,
  },
  description,
  openGraph: {
    type: "website",
    siteName: brand.name,
    title: `${brand.name} — Train better AI with verified human expertise`,
    description,
    url: "/",
  },
  twitter: {
    card: "summary_large_image",
    title: `${brand.name} — Train better AI with verified human expertise`,
    description,
    site: "@traivr",
  },
};

// Organization + WebSite structured data — lets search engines show the
// brand name, logo, and (once enough pages exist) a sitelinks search box
// directly in results, instead of just a bare blue link. Sits once at the
// root rather than per-page since it describes the site, not a page.
const structuredData = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `https://${brand.domain}/#organization`,
      name: brand.name,
      url: `https://${brand.domain}`,
      logo: `https://${brand.domain}/opengraph-image`,
      sameAs: [brand.social.linkedin, brand.social.twitter],
    },
    {
      "@type": "WebSite",
      "@id": `https://${brand.domain}/#website`,
      name: brand.name,
      url: `https://${brand.domain}`,
      publisher: { "@id": `https://${brand.domain}/#organization` },
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${sans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }} />
        <ThemeProvider>
          <AuthSessionProvider>
            <QueryProvider>
              {children}
              <Toaster richColors closeButton position="top-right" />
            </QueryProvider>
          </AuthSessionProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
