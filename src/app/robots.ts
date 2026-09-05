import type { MetadataRoute } from "next";
import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // The specimen employment contract is UNLISTED: candidates reach it from
      // the link in their job offer, and the company's employment terms should
      // not be indexed. The page also sends `noindex` and the PDF is served
      // with an X-Robots-Tag header (see next.config.mjs) — robots.txt alone
      // does not stop a document that someone else has linked to.
      disallow: ["/sample-contract", "/documents/"],
      // Demonstration submissions go nowhere; no private endpoints to disallow yet.
      // Add disallow paths here (e.g. "/api/") once a backend is connected.
    },
    sitemap: `${siteConfig.url}/sitemap.xml`,
    host: siteConfig.url,
  };
}
