import type { Metadata } from "next";
import { LegalPage } from "@/components/legal/legal-page";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: `Terms for using ${siteConfig.name}.`,
  alternates: { canonical: "/terms" },
};

export default function TermsPage() {
  return (
    <LegalPage title="Terms of Use" updated="October 2026">
      <h2>Entertainment only</h2>
      <p>
        {siteConfig.disclaimer} Readings describe traditional palmistry beliefs and are generated
        with the help of AI. They may be inaccurate and must not be relied on for medical, legal,
        financial, relationship or other important decisions.
      </p>
      <h2>Your photos</h2>
      <p>
        Only upload photos of your own hand, or of someone who has given you permission. Don&apos;t
        upload images of anything else. You keep ownership of your photos; you grant us permission
        to process them solely to provide your reading.
      </p>
      <h2>Image analysis confidence</h2>
      <p>
        Confidence scores describe how clearly the AI could see features in your photo. They are not
        a measure of how accurate or true any reading is.
      </p>
      <h2>Purchases</h2>
      <p>
        All purchases are one-time digital purchases; nothing renews automatically. A detailed
        reading or couple reading unlocks that one reading. A family pack adds reading credits (one
        credit unlocks one detailed reading) that do not expire. A gift code adds one reading credit
        to the account that redeems it and is valid for a year. Membership unlocks the detailed
        reading of every reading on your account for one year from purchase (renewing early extends
        it).
      </p>
      <p>
        The PalmAI wallet is a closed-loop balance: it can only be spent on PalmAI, and it cannot be
        withdrawn, refunded as cash or transferred. Top-up bonuses are added when the payment is
        confirmed. Referral rewards are reading credits, limited per month, for friends who join
        through your link and complete a reading.
      </p>
      <p>
        Refunds are handled according to applicable consumer law; contact {siteConfig.supportEmail}.
      </p>
      <h2>Ask a Reader</h2>
      <p>
        PalmAI&apos;s readers are AI characters with their own style. They are not real people, and
        their portraits are illustrations. Questions you buy belong to that conversation and
        don&apos;t expire. A question is only used when an answer is delivered.
      </p>
      <h2>Couple readings</h2>
      <p>
        Only upload your partner&apos;s palm with their agreement. Their photo is used for your
        couple reading only, is never used for training, and is deleted with your readings.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Don&apos;t attempt to access other people&apos;s readings, overload the service, or misuse
        the AI features.
      </p>
    </LegalPage>
  );
}
