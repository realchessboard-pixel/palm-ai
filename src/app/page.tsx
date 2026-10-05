import { headers } from "next/headers";
import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { ExampleReading } from "@/components/landing/example-reading";
import { Faq, FAQ_ITEMS } from "@/components/landing/faq";
import { Features } from "@/components/landing/features";
import { Hero } from "@/components/landing/hero";
import { HowItWorks } from "@/components/landing/how-it-works";
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
      <Hero />
      <div className="gold-hairline mx-auto max-w-4xl" aria-hidden="true" />
      <HowItWorks />
      <Features />
      <ExampleReading />
      <PrivacySection />
      <Faq />
      <section aria-labelledby="cta-title" className="px-4 pt-8 pb-24 sm:px-6">
        <div className="mx-auto max-w-3xl text-center">
          <h2 id="cta-title" className="text-3xl sm:text-5xl">
            Ready to look a little closer?
          </h2>
          <p className="mt-4 text-mist">It takes about a minute. Your first reading is free.</p>
          <ButtonLink href="/read" size="lg" className="mt-8">
            Read My Palm
          </ButtonLink>
          <Disclaimer className="mt-12 text-left" />
        </div>
      </section>
    </>
  );
}
