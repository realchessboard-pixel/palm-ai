import type { MetadataRoute } from "next";
import { SIGN_SLUGS } from "@/lib/astro/constants";
import { siteConfig } from "@/lib/config/site";
import { SEO_LANGUAGES } from "@/lib/horoscope/seo";

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: `${siteConfig.url}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${siteConfig.url}/read`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    {
      url: `${siteConfig.url}/example`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteConfig.url}/pricing`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteConfig.url}/horoscope`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.9,
    },
    {
      url: `${siteConfig.url}/kundli`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.9,
    },
    {
      url: `${siteConfig.url}/kundli-milan`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteConfig.url}/rashifal-report`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteConfig.url}/panchang`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${siteConfig.url}/readers`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.8,
    },
    {
      url: `${siteConfig.url}/compatibility`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${siteConfig.url}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${siteConfig.url}/how-readings-work`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    { url: `${siteConfig.url}/terms`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
    ...SIGN_SLUGS.map((sign) => ({
      url: `${siteConfig.url}/horoscope/${sign}`,
      lastModified: now,
      changeFrequency: "daily" as const,
      priority: 0.7,
    })),
    // Search pages: today's rashifal per language and sign, e.g. /rashifal/hi/aries.
    ...SEO_LANGUAGES.flatMap((lang) => [
      {
        url: `${siteConfig.url}/rashifal/${lang}`,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.8,
      },
      ...SIGN_SLUGS.map((sign) => ({
        url: `${siteConfig.url}/rashifal/${lang}/${sign}`,
        lastModified: now,
        changeFrequency: "daily" as const,
        priority: 0.8,
        alternates: {
          languages: Object.fromEntries(
            SEO_LANGUAGES.map((l) => [l, `${siteConfig.url}/rashifal/${l}/${sign}`]),
          ),
        },
      })),
    ]),
  ];
}
