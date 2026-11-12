import { T } from "@/components/i18n/i18n";
import type { Metadata, Viewport } from "next";
import { Fraunces, Inter } from "next/font/google";
import { headers } from "next/headers";
import Script from "next/script";
import { AdsProvider, DisplayAd, StickyMobileAd } from "@/components/ads/display-ad";
import { displayAds } from "@/lib/monetization/display-ads";
import { SiteFooter } from "@/components/layout/site-footer";
import { BottomTabs } from "@/components/layout/bottom-tabs";
import { FirstVisitLanguagePicker } from "@/components/layout/language-picker";
import { I18nProvider } from "@/components/i18n/i18n";
import { phrasesFor } from "@/lib/i18n/phrases";
import { getLanguage, getT, hasChosenLanguage } from "@/lib/i18n/server";
import { t } from "@/lib/i18n/ui";
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

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return {
    metadataBase: new URL(siteConfig.url),
    title: { default: tx(siteConfig.title), template: `%s · ${siteConfig.name}` },
    description: tx(siteConfig.description),
    keywords: [...siteConfig.keywords],
    applicationName: siteConfig.name,
    alternates: { canonical: "/" },
    openGraph: {
      type: "website",
      siteName: siteConfig.name,
      title: tx(siteConfig.title),
      description: tx(siteConfig.description),
      url: "/",
      locale: "en_US",
    },
    twitter: {
      card: "summary_large_image",
      title: tx(siteConfig.title),
      description: tx(siteConfig.description),
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
}

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

  const ads = displayAds();
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  const lang = await getLanguage();
  const chosen = await hasChosenLanguage();

  return (
    <html lang={lang} className={`${inter.variable} ${fraunces.variable}`}>
      <body
        className={`sky-backdrop min-h-dvh antialiased md:pb-0 ${ads.mode === "off" ? "pb-16" : "pb-36"}`}
      >
        {ads.mode === "on" ? (
          // AdSense, with Auto ads: Google adds in-page, anchor and other ads on top of our slots.
          <Script
            id="adsense"
            async
            strategy="afterInteractive"
            nonce={nonce}
            crossOrigin="anonymous"
            src={`https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${ads.client}`}
          />
        ) : null}
        <I18nProvider lang={lang} dict={phrasesFor(lang)}>
          <AdsProvider ads={ads}>
            <a
              href="#main"
              className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-full focus:bg-gold-300 focus:px-4 focus:py-2 focus:text-night-950"
            >
              <T s="Skip to content" />
            </a>
            <SiteHeader
              user={user ? { email: user.email, isAdmin: user.isAdmin } : null}
              lang={lang}
            />
            <DisplayAd ads={ads} position="top" />
            <main id="main" className="relative">
              {children}
            </main>
            <DisplayAd ads={ads} position="bottom" />
            <SiteFooter />
            <StickyMobileAd ads={ads} />
            <BottomTabs
              labels={{
                home: t(lang, "tab.home"),
                rashifal: t(lang, "tab.rashifal"),
                palm: t(lang, "tab.palm"),
                kundli: t(lang, "tab.kundli"),
                ask: t(lang, "tab.ask"),
              }}
            />
            {chosen ? null : (
              <FirstVisitLanguagePicker
                title={t(lang, "picker.title")}
                subtitle={t(lang, "picker.subtitle")}
              />
            )}
            <ServiceWorkerRegistration />
            <ReferralCapture />
          </AdsProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
