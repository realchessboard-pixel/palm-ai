"use client";

import { useT } from "@/components/i18n/i18n";
import { T } from "@/components/i18n/i18n";
import { WhatsAppShare } from "@/components/share/whatsapp-share";
import { ButtonLink } from "@/components/ui/button";

/**
 * After the reading: invite the visitor to share AstroVidya on WhatsApp (only the
 * headline they choose to send, never the reading itself) and to read their
 * palm together with their partner.
 */
export function ShareAndCouple({
  readingId,
  headline,
  shareUrl,
  couplePriceLabel,
  referralNote,
}: {
  readingId: string;
  headline: string;
  shareUrl: string;
  couplePriceLabel: string;
  referralNote: string | null;
}) {
  const tx = useT();
  return (
    <section aria-labelledby="share-title" className="grid gap-4 md:grid-cols-2">
      <div className="glass space-y-3 rounded-3xl p-6">
        <h2 id="share-title" className="text-xl text-gold-200">
          <T s="Enjoyed your reading?" />
        </h2>
        <p className="text-sm text-mist">
          <T
            s="Send it to family and friends on WhatsApp — they can read their own palm free.{0}"
            v={[referralNote ? ` ${referralNote}` : ""]}
          />
        </p>
        <WhatsAppShare
          context="reading"
          text={tx("My palm reading on AstroVidya says: “{0}” ✋ Read your palm free:", [headline])}
          url={shareUrl}
        />
      </div>
      <div className="glass space-y-3 rounded-3xl p-6">
        <h2 className="text-xl text-gold-200">
          <T s="Read as a couple" />
        </h2>
        <p className="text-sm text-mist">
          <T
            s="Show your partner's right palm too, and see how the two of you think, care and grow together — no scores, no predictions. {0}."
            v={[couplePriceLabel]}
          />
        </p>
        <ButtonLink href={`/compatibility/new?reading=${readingId}`} variant="secondary">
          <T s="Read our palms together" />
        </ButtonLink>
      </div>
    </section>
  );
}
