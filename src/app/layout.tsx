import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { headers } from "next/headers";
import { SiteFooter } from "@/components/layout/site-footer";
import { BottomTabs } from "@/components/layout/bottom-tabs";
import { SiteHeader } from "@/components/layout/site-header";
import { ServiceWorkerRegistration } from "@/components/pwa/service-worker-registration";
import { ReferralCapture } from "@/components/share/referral-capture";
import { getCurrentUser } from "@/lib/auth/actor";
import { siteConfig } from "@/lib/config/site";
import { logger } from "@/lib/logger";
import "./globals.css";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter", display: "swap" });
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  display: "swap",
  axes: ["opsz"],
});

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: { default: siteConfig.title, template: `%s · ${siteConfig.name}` },
  description: siteConfig.description,
  keywords: [...siteConfig.keywords],
  applicationName: siteConfig.name,
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: siteConfig.name,
    title: siteConfig.title,
    description: siteConfig.description,
    url: "/",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: siteConfig.title,
    description: siteConfig.description,
  },
  appleWebApp: { capable: true, title: siteConfig.name, statusBarStyle: "black-translucent" },
  formatDetection: { telephone: false },
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: "#f4ecdd",
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  colorScheme: "dark",
};

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  // Reading request headers opts every page into dynamic rendering, which the
  // per-request CSP nonce set in src/proxy.ts requires.
  await headers();
  // The header should still render if the database is briefly unavailable.
  const user = await getCurrentUser().catch((error) => {
    logger.error("layout_user_lookup_failed", { error });
    return null;
  });

  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body className="sky-backdrop min-h-dvh pb-16 antialiased md:pb-0">
        <a
          href="#main"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-gold-300 focus:px-4 focus:py-2 focus:text-night-950"
        >
          Skip to content
        </a>
        <SiteHeader user={user ? { email: user.email, isAdmin: user.isAdmin } : null} />
        <main id="main" className="relative">
          {children}
        </main>
        <SiteFooter />
        <BottomTabs />
        <ServiceWorkerRegistration />
        <ReferralCapture />
      </body>
    </html>
  );
}
