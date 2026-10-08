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
  return (
    <section aria-labelledby="share-title" className="grid gap-4 md:grid-cols-2">
      <div className="glass space-y-3 rounded-3xl p-6">
        <h2 id="share-title" className="text-xl text-gold-200">
          Enjoyed your reading?
        </h2>
        <p className="text-sm text-mist">
          Send it to family and friends on WhatsApp — they can read their own palm free.
          {referralNote ? ` ${referralNote}` : ""}
        </p>
        <WhatsAppShare
          context="reading"
          text={`My palm reading on AstroVidya says: “${headline}” ✋ Read your palm free:`}
          url={shareUrl}
        />
      </div>
      <div className="glass space-y-3 rounded-3xl p-6">
        <h2 className="text-xl text-gold-200">Read as a couple</h2>
        <p className="text-sm text-mist">
          Show your partner&apos;s right palm too, and see how the two of you think, care and grow
          together — no scores, no predictions. {couplePriceLabel}.
        </p>
        <ButtonLink href={`/compatibility/new?reading=${readingId}`} variant="secondary">
          Read our palms together
        </ButtonLink>
      </div>
    </section>
  );
}
