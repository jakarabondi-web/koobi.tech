import type { MetadataRoute } from "next";

import { brand } from "@/config/brand";

/**
 * Keeps signed-in-only surfaces out of the crawl entirely — there's nothing
 * for a search engine to index behind auth, and letting crawlers hit
 * hundreds of trainer/client/admin routes just wastes crawl budget that
 * should go to the public marketing pages.
 */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/trainer/", "/client/", "/admin/", "/api/"],
    },
    sitemap: `https://${brand.domain}/sitemap.xml`,
  };
}
