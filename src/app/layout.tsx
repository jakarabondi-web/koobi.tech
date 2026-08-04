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
