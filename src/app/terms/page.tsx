import { getLanguage } from "@/lib/i18n/server";
import { localeFor } from "@/lib/i18n/languages";
import { getT } from "@/lib/i18n/server";
import { T } from "@/components/i18n/i18n";
import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { siteConfig } from "@/lib/config/site";

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return {
    title: tx("Terms of Use"),
    description: tx("Terms for using AstroVidya."),
    alternates: { canonical: "/terms" },
  };
}

export default async function TermsPage() {
  const tx = await getT();
  const locale = localeFor(await getLanguage());
  return (
    <LegalPage
      title={tx("Terms of Use")}
      updated={new Date("2026-10-01T00:00:00Z").toLocaleDateString(locale, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })}
    >
      <h2>
        <T s="Entertainment only" />
      </h2>
      <p>
        <T
          s="{0} Readings describe traditional palmistry beliefs and are generated with the help of AI. They may be inaccurate and must not be relied on for medical, legal, financial, relationship or other important decisions."
          v={[tx(siteConfig.disclaimer)]}
        />
      </p>
      <h2>
        <T s="Your photos" />
      </h2>
      <p>
        <T s="Only upload photos of your own hand, or of someone who has given you permission. Don't upload images of anything else. You keep ownership of your photos; you grant us permission to process them solely to provide your reading." />
      </p>
      <h2>
        <T s="Image analysis confidence" />
      </h2>
      <p>
        <T s="Confidence scores describe how clearly the AI could see features in your photo. They are not a measure of how accurate or true any reading is." />
      </p>
      <h2>
        <T s="Purchases" />
      </h2>
      <p>
        <T s="All purchases are one-time digital purchases; nothing renews automatically. A detailed reading or couple reading unlocks that one reading. A family pack adds reading credits (one credit unlocks one detailed reading) that do not expire. A gift code adds one reading credit to the account that redeems it and is valid for a year. Membership unlocks the detailed reading of every reading on your account for one year from purchase (renewing early extends it)." />
      </p>
      <p>
        <T s="The AstroVidya wallet is a closed-loop balance: it can only be spent on AstroVidya, and it cannot be withdrawn, refunded as cash or transferred. Top-up bonuses are added when the payment is confirmed. Referral rewards are reading credits, limited per month, for friends who join through your link and complete a reading." />
      </p>
      <p>
        <T
          s="Refunds are handled according to applicable consumer law; contact {0}."
          v={[siteConfig.supportEmail]}
        />
      </p>
      <h2>
        <T s="Astrology" />
      </h2>
      <p>
        <T s="Kundli, Kundli Milan, panchang and rashifal are calculated with standard astronomical methods (Lahiri ayanamsa) and described in the Jyotish tradition for reflection and cultural interest. They are not predictions, and Guna Milan does not decide whether a relationship or marriage is right. A free Kundli is calculated in your browser; your birth details are stored only if you ask for the full Kundli reading." />
      </p>
      <h2>
        <T s="Ask a Reader" />
      </h2>
      <p>
        <T s="AstroVidya's readers are AI characters with their own style. They are not real people, and their portraits are illustrations. Questions you buy belong to that conversation and don't expire. A question is only used when an answer is delivered." />
      </p>
      <h2>
        <T s="Couple readings" />
      </h2>
      <p>
        <T s="Only upload your partner's palm with their agreement. Their photo is used for your couple reading only, is never used for training, and is deleted with your readings." />
      </p>
      <h2>
        <T s="Acceptable use" />
      </h2>
      <p>
        <T s="Don't attempt to access other people's readings, overload the service, or misuse the AI features." />
      </p>
    </LegalPage>
  );
}
