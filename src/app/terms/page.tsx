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
        Full reports are one-time digital purchases tied to a single reading. Refunds are handled
        according to applicable consumer law; contact {siteConfig.supportEmail}.
      </p>
      <h2>Acceptable use</h2>
      <p>
        Don&apos;t attempt to access other people&apos;s readings, overload the service, or misuse
        the AI features.
      </p>
    </LegalPage>
  );
}
