import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { ResultsDashboard } from "@/components/results/results-dashboard";
import { ReadingStatusPanel } from "@/components/results/reading-status-panel";
import { Alert } from "@/components/ui/misc";
import { getActor } from "@/lib/auth/actor";
import { isAppError } from "@/lib/http/errors";
import { extendedReadingPrice, paymentsEnabled } from "@/lib/payments/pricing";
import { adMode } from "@/lib/monetization/ads";
import { cancelPendingCheckout, confirmStripeReturn } from "@/lib/payments/service";
import { getReadingView } from "@/lib/readings/service";
import type { ReadingView } from "@/lib/readings/view";
import { IdSchema } from "@/lib/schemas/api";

export const metadata: Metadata = {
  title: "Your Palm Reading",
  // Readings are private: never index them.
  robots: { index: false, follow: false },
};

export default async function ReadingPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ checkout?: string; session_id?: string }>;
}) {
  const { id } = await params;
  const { checkout, session_id: sessionId } = await searchParams;
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
    reading = await getReadingView(id, actor);
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
        adMode={adMode()}
      />
    </>
  );
}

/** After returning from checkout. Driven by the server's payment record, not the URL. */
function CheckoutNotice({ reading }: { reading: ReadingView }) {
  const notice = reading.premium ? (
    <Alert tone="success">Thank you — your detailed reading is unlocked.</Alert>
  ) : reading.paymentState === "PAYMENT_FAILED" ? (
    <Alert tone="error">
      Your payment didn&apos;t go through, so nothing was unlocked. You can try again below.
    </Alert>
  ) : reading.paymentState === "PAYMENT_CANCELLED" ? (
    <Alert tone="info">Checkout was cancelled. You have not been charged.</Alert>
  ) : reading.paymentState === "PAYMENT_INITIATED" ? (
    <Alert tone="info">
      Your payment is being confirmed. This usually takes a few seconds — refresh the page shortly.
    </Alert>
  ) : null;
  return notice ? <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">{notice}</div> : null;
}
