import type { Metadata } from "next";
import Link from "next/link";
import { LegalPage } from "@/components/legal/legal-page";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: `How ${siteConfig.name} handles your palm photos and personal data.`,
  alternates: { canonical: "/privacy" },
};

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="October 2026">
      <p>
        {siteConfig.name} treats photos of your hand as sensitive personal data. This policy
        explains what we collect, why, and the choices you have.
      </p>
      <h2>What we collect</h2>
      <ul>
        <li>The palm photo you upload, re-encoded without camera or location metadata.</li>
        <li>
          The structured features our AI observed in the photo and the reading generated from them.
        </li>
        <li>If you create an account: your email address and a securely hashed password.</li>
        <li>
          Minimal, non-identifying usage events (for example, &quot;reading started&quot;) to
          improve the product.
        </li>
        <li>
          Payment records if you buy a full report. Card details are handled by our payment
          provider, never by us.
        </li>
      </ul>
      <h2>How photos are stored</h2>
      <ul>
        <li>Photos are kept in private storage and are never published at a public URL.</li>
        <li>Only you can view your photo, through an authenticated link that is not cached.</li>
        <li>Photos that cannot be read, or readings that fail, are deleted automatically.</li>
        <li>Readings made without an account are deleted after a limited retention period.</li>
      </ul>
      <h2>AI processing</h2>
      <p>
        To analyze your palm we send the photo to an AI provider configured by us, under terms that
        prohibit using it to train their models where such terms are available. We do not use your
        palm photos to train or improve AI models unless you explicitly opt in, and you can change
        that choice at any time in your account.
      </p>
      <h2>Your choices</h2>
      <ul>
        <li>Delete any single reading and its photo at any time.</li>
        <li>
          Use{" "}
          <Link href="/account" className="text-gold-300 underline">
            Delete my data
          </Link>{" "}
          to remove all readings, or delete your account entirely.
        </li>
        <li>Contact us at {siteConfig.supportEmail} for access or deletion requests.</li>
      </ul>
      <h2>Cookies</h2>
      <p>
        We use strictly necessary cookies only: a session cookie when you sign in and an anonymous
        cookie that links readings to your browser before you create an account. We do not use
        advertising or third-party tracking cookies.
      </p>
    </LegalPage>
  );
}
