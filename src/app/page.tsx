import { headers } from "next/headers";
import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { Faq, FAQ_ITEMS } from "@/components/landing/faq";
import { HomeFunnel } from "@/components/landing/home-funnel";
import { PrivacySection } from "@/components/landing/privacy-section";
import { ButtonLink } from "@/components/ui/button";
import { Disclaimer } from "@/components/ui/disclaimer";
import { siteConfig } from "@/lib/config/site";

function structuredData() {
  return [
    {
      "@context": "https://schema.org",
      "@type": "WebApplication",
      name: siteConfig.name,
      url: siteConfig.url,
      applicationCategory: "LifestyleApplication",
      operatingSystem: "Any",
      description: siteConfig.description,
      offers: {
        "@type": "Offer",
        price: "0",
        priceCurrency: "USD",
        description: "Free basic reading",
      },
    },
    {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: FAQ_ITEMS.map((item) => ({
        "@type": "Question",
        name: item.q,
        acceptedAnswer: { "@type": "Answer", text: item.a },
      })),
    },
  ];
}

export default async function LandingPage() {
  const nonce = (await headers()).get("x-nonce") ?? undefined;
  // JSON-LD built only from our own static content; "<" is escaped so the
  // payload can never close the script element.
  const jsonLd = JSON.stringify(structuredData()).replace(/</g, "\\u003c");

  return (
    <>
      <script
        type="application/ld+json"
        nonce={nonce}
        dangerouslySetInnerHTML={{ __html: jsonLd }}
      />
      <TrackOnMount event="landing_page_view" />
      <HomeFunnel />
      <PrivacySection />
      <Faq />
      <section aria-labelledby="cta-title" className="px-4 pt-8 pb-24 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="cta-title" className="text-3xl sm:text-5xl">
            Start with one free answer
          </h2>
          <p className="mt-4 text-mist">
            Four birth details or one photo of your palm. Pay only if you want the full report.
          </p>
          <div className="mt-8 flex flex-col justify-center gap-3 sm:flex-row">
            <ButtonLink href="/mahakundli" size="lg">
              Get my first answer free
            </ButtonLink>
            <ButtonLink href="/read" size="lg" variant="secondary">
              Read my palm
            </ButtonLink>
          </div>
          <Disclaimer className="mt-12 text-left" />
        </div>
      </section>
    </>
  );
}
