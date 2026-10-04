import type { MetadataRoute } from "next";
import { siteConfig } from "@/lib/config/site";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        // Private or user-specific areas.
        disallow: ["/api/", "/readings", "/account", "/admin", "/login", "/signup"],
      },
    ],
    sitemap: `${siteConfig.url}/sitemap.xml`,
  };
}
