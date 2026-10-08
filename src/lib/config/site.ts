/**
 * Public, non-secret product configuration. Safe to import from client code.
 * Change the product name in one place via NEXT_PUBLIC_APP_NAME.
 */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "AstroVidya",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  title: "AstroVidya — Mahakundli, Palm Reading, Kundli & Rashifal",
  description:
    "Your Mahakundli, palm reading, free Kundli, Kundli Milan, panchang and daily rashifal — readings prepared for you alone, in the Indian tradition.",
  keywords: [
    "palm reading",
    "palmistry reading",
    "palm reading online",
    "mahakundli",
    "palm lines meaning",
  ],
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "privacy@example.com",
  disclaimer:
    "Palmistry readings are for entertainment, cultural and personal-reflection purposes only. They are not scientifically validated and are not predictions, diagnoses or professional advice.",
} as const;

export type SiteConfig = typeof siteConfig;
