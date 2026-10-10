import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import "./globals.css";
import { siteConfig } from "@/config/site";
import { organizationJsonLd } from "@/lib/seo";
import { SiteHeader, SiteFooter } from "@/components/layout/SiteChrome";
import { CookieConsent } from "@/components/cookies/CookieConsent";
import { STORAGE_KEY as COOKIE_STORAGE_KEY } from "@/components/cookies/cookieConsent";
import { Beacon } from "@/components/Beacon";

const inter = Inter({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-inter",
});

/** Headings only: the heavier geometric face the approved design uses. */
const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-display",
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  // Emit a canonical URL on every route. The site answers on more than one
  // hostname (the Railway subdomain as well as the real domain), and without
  // this a search engine can index each as a separate site and split the
  // ranking between them. "./" resolves per-route against metadataBase.
  alternates: { canonical: "./" },
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
  // No handle: there is no company account on X any more, and attributing the
  // card to one that does not exist is worse than leaving it unattributed. The
  // card itself stays, because it is what gives a shared link its image.
  twitter: {
    card: "summary_large_image",
    title: `${siteConfig.company.name} — Customer Support Careers`,
    description: siteConfig.company.tagline,
    images: ["/og-image.png"],
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/**
 * Marks a visitor who has already answered the cookie banner, before the first
 * paint, so the server-rendered banner never flashes up for them. Inline and
 * tiny on purpose: it has to run before the page is drawn, and anything that
 * waits for the scripts is too late. See CookieConsent.
 */
const CONSENT_CHECK = `try{if(localStorage.getItem(${JSON.stringify(
  COOKIE_STORAGE_KEY,
)}))document.documentElement.setAttribute("data-consent","1")}catch(e){}`;

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    // suppressHydrationWarning: the consent check adds an attribute here
    // before React takes over, which is expected.
    <html lang="en" className={`${inter.variable} ${jakarta.variable}`} suppressHydrationWarning>
      <head>
        {/* eslint-disable-next-line react/no-danger */}
        <script dangerouslySetInnerHTML={{ __html: CONSENT_CHECK }} />
      </head>
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
        <Beacon />
      </body>
    </html>
  );
}
