/**
 * Public, non-secret product configuration. Safe to import from client code.
 * Change the product name in one place via NEXT_PUBLIC_APP_NAME.
 */
export const siteConfig = {
  name: process.env.NEXT_PUBLIC_APP_NAME || "PalmAI",
  url: process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  title: "AI Palm Reading Online — Discover What Your Palm Reveals",
  description:
    "Upload a clear photo of your palm and explore a personalized palmistry reading powered by AI. An entertaining, reflective take on traditional palm reading.",
  keywords: [
    "AI palm reading",
    "palmistry reading",
    "palm reading online",
    "AI palmistry",
    "palm lines meaning",
  ],
  supportEmail: process.env.NEXT_PUBLIC_SUPPORT_EMAIL || "privacy@example.com",
  disclaimer:
    "Palmistry readings are for entertainment, cultural and personal-reflection purposes only. They are not scientifically validated and are not predictions, diagnoses or professional advice.",
} as const;

export type SiteConfig = typeof siteConfig;
