import { getLanguage } from "@/lib/i18n/server";
import { localeFor } from "@/lib/i18n/languages";
import { getT } from "@/lib/i18n/server";
import { T } from "@/components/i18n/i18n";
import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import { siteConfig } from "@/lib/config/site";

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return {
    title: tx("Privacy Policy"),
    description: tx("How AstroVidya handles your palm photos and personal data."),
    alternates: { canonical: "/privacy" },
  };
}

export default async function PrivacyPage() {
  const tx = await getT();
  const locale = localeFor(await getLanguage());
  return (
    <LegalPage
      title={tx("Privacy Policy")}
      updated={new Date("2026-10-01T00:00:00Z").toLocaleDateString(locale, {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      })}
    >
      <p>
        <T
          s="{0} treats photos of your hand as sensitive personal data. This policy explains what we collect, why, and the choices you have."
          v={[siteConfig.name]}
        />
      </p>
      <h2>
        <T s="What we collect" />
      </h2>
      <ul>
        <li>
          <T s="The palm photo you upload, re-encoded without camera or location metadata." />
        </li>
        <li>
          <T s="The structured features our AI observed in the photo and the reading generated from them." />
        </li>
        <li>
          <T s="If you create an account: your email address and a securely hashed password." />
        </li>
        <li>
          <T
            s={
              'Minimal, non-identifying usage events (for example, "reading started") to improve the product.'
            }
          />
        </li>
        <li>
          <T s="Payment records if you buy a full report. Card details are handled by our payment provider, never by us." />
        </li>
      </ul>
      <h2>
        <T s="How photos are stored" />
      </h2>
      <ul>
        <li>
          <T s="Photos are kept in private storage and are never published at a public URL." />
        </li>
        <li>
          <T s="Only you can view your photo, through an authenticated link that is not cached." />
        </li>
        <li>
          <T s="Photos that cannot be read, or readings that fail, are deleted automatically." />
        </li>
        <li>
          <T s="Readings made without an account are deleted after a limited retention period." />
        </li>
      </ul>
      <h2>
        <T s="AI processing" />
      </h2>
      <p>
        <T s="To analyze your palm we send the photo to an AI provider configured by us, under terms that prohibit using it to train their models where such terms are available. We do not use your palm photos to train or improve AI models unless you explicitly opt in, and you can change that choice at any time in your account." />
      </p>
      <h2>
        <T s="Your choices" />
      </h2>
      <ul>
        <li>
          <T s="Delete any single reading and its photo at any time." />
        </li>
        <li>
          <T
            s="Use {0} to remove all readings, or delete your account entirely."
            v={[
              <Link key={0} href="/account" className="text-gold-300 underline">
                <T s="Delete my data" />
              </Link>,
            ]}
          />
        </li>
        <li>
          <T s="Contact us at {0} for access or deletion requests." v={[siteConfig.supportEmail]} />
        </li>
      </ul>
      <h2>
        <T s="Cookies" />
      </h2>
      <p>
        <T s="We use strictly necessary cookies only: a session cookie when you sign in and an anonymous cookie that links readings to your browser before you create an account. We do not use advertising or third-party tracking cookies." />
      </p>
    </LegalPage>
  );
}
