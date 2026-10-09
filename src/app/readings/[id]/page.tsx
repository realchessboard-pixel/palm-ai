import { getT } from "@/lib/i18n/server";
import { T } from "@/components/i18n/i18n";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { ResultsDashboard } from "@/components/results/results-dashboard";
import { ReadingStatusPanel } from "@/components/results/reading-status-panel";
import { Alert } from "@/components/ui/misc";
import { getActor } from "@/lib/auth/actor";
import { isAppError } from "@/lib/http/errors";
import { extendedReadingPrice, paymentsEnabled } from "@/lib/payments/pricing";
import { getEnv } from "@/lib/config/env";
import { REFERRALS_PER_CREDIT, ensureReferralCode } from "@/lib/growth/referrals";
import { getAccountBalances } from "@/lib/monetization/account";
import { cancelPendingCheckout, confirmStripeReturn } from "@/lib/payments/service";
import { getReadingView } from "@/lib/readings/service";
import type { ReadingView } from "@/lib/readings/view";
import { getLanguage } from "@/lib/i18n/server";
import { IdSchema } from "@/lib/schemas/api";

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return {
    title: tx("Your Palm Reading"),
    // Readings are private: never index them.
    robots: { index: false, follow: false },
  };
}

export default async function ReadingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkout?: string; session_id?: string; lang?: string }>;
}) {
  const tx = await getT();
  const { id } = await params;
  const { checkout, session_id: sessionId, lang } = await searchParams;
  const language = await getLanguage(lang);
  if (!IdSchema.safeParse(id).success) notFound();
  const actor = await getActor();

  // Returning from Stripe Checkout: confirm server-side (ownership is checked below).
  // The query string only chooses a message — access always comes from the server's
  // record of a verified payment.
  if (checkout === "success" && sessionId) await confirmStripeReturn(sessionId, id);
  if (checkout === "cancelled") {
    await cancelPendingCheckout(id, actor).catch((error) => {
      if (!(isAppError(error) && error.code === "NOT_FOUND")) throw error;
    });
  }

  let reading;
  try {
    reading = await getReadingView(id, actor, { language });
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  // Analyzed but not yet interpreted: show the palm map now and write the reading in place.
  const interpretationPending =
    !reading.interpretation &&
    reading.features.length > 0 &&
    (reading.status === "ANALYZED" ||
      reading.status === "INTERPRETING" ||
      reading.status === "FAILED");
  if (!interpretationPending && (reading.status !== "COMPLETE" || !reading.interpretation)) {
    return <ReadingStatusPanel reading={reading} />;
  }

  const balances = actor.user && reading.locked ? await getAccountBalances(actor.user.id) : null;
  const appUrl = getEnv().NEXT_PUBLIC_APP_URL.replace(/\/$/, "");
  const referralCode = actor.user ? await ensureReferralCode(actor.user.id) : null;

  return (
    <>
      {interpretationPending ? null : (
        <TrackOnMount event="reading_viewed" properties={{ premium: reading.premium }} />
      )}
      {checkout ? <CheckoutNotice reading={reading} /> : null}
      <ResultsDashboard
        reading={reading}
        priceLabel={extendedReadingPrice().label}
        paymentsEnabled={paymentsEnabled()}
        signedIn={Boolean(actor.user)}
        interpretationPending={interpretationPending}
        balances={balances}
        shareUrl={referralCode ? `${appUrl}/?ref=${referralCode}` : `${appUrl}/`}
        referralNote={
          referralCode
            ? tx(
                "When {0} friends join through your link and read their palm, you get a free detailed reading.",
                [REFERRALS_PER_CREDIT],
              )
            : null
        }
      />
    </>
  );
}

/** After returning from checkout. Driven by the server's payment record, not the URL. */
function CheckoutNotice({ reading }: { reading: ReadingView }) {
  const notice = reading.premium ? (
    <Alert tone="success">
      <T s="Thank you — your detailed reading is unlocked." />
    </Alert>
  ) : reading.paymentState === "PAYMENT_FAILED" ? (
    <Alert tone="error">
      <T s="Your payment didn't go through, so nothing was unlocked. You can try again below." />
    </Alert>
  ) : reading.paymentState === "PAYMENT_CANCELLED" ? (
    <Alert tone="info">
      <T s="Checkout was cancelled. You have not been charged." />
    </Alert>
  ) : reading.paymentState === "PAYMENT_INITIATED" ? (
    <Alert tone="info">
      <T s="Your payment is being confirmed. This usually takes a few seconds — refresh the page shortly." />
    </Alert>
  ) : null;
  return notice ? <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">{notice}</div> : null;
}
