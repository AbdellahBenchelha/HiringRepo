import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { organizationJsonLd } from "@/lib/seo";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteChrome";
import { CookieConsent } from "@/components/cookies/CookieConsent";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: `${siteConfig.company.name} — Customer Support & Call-Center Careers`,
    template: `%s | ${siteConfig.company.name}`,
  },
  description:
    "Join WorkRoute. Explore customer-support and call-center careers, professional training, and multilingual opportunities. Apply online today.",
  applicationName: siteConfig.company.name,
  authors: [{ name: siteConfig.company.name }],
  keywords: [
    "customer support jobs",
    "call center careers",
    "live chat support",
    "technical support representative",
    "multilingual customer service",
    "remote support jobs",
  ],
  robots: { index: true, follow: true },
  openGraph: {
    type: "website",
    siteName: siteConfig.company.name,
    title: `${siteConfig.company.name} — Customer Support Careers`,
    description: siteConfig.company.tagline,
    url: siteConfig.url,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: siteConfig.company.name }],
  },
  twitter: { card: "summary_large_image" },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <script
          type="application/ld+json"
          // eslint-disable-next-line react/no-danger
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd()) }}
        />
        <SiteHeader />
        <main id="main">{children}</main>
        <SiteFooter />
        <CookieConsent />
      </body>
    </html>
  );
}
