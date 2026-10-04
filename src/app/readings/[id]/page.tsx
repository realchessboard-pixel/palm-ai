import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { ResultsDashboard } from "@/components/results/results-dashboard";
import { ReadingStatusPanel } from "@/components/results/reading-status-panel";
import { Alert } from "@/components/ui/misc";
import { getActor } from "@/lib/auth/actor";
import { isAppError } from "@/lib/http/errors";
import { paymentsEnabled, premiumPrice } from "@/lib/payments/pricing";
import { confirmStripeReturn } from "@/lib/payments/service";
import { getReadingView } from "@/lib/readings/service";
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
  if (checkout === "success" && sessionId) await confirmStripeReturn(sessionId, id);

  let reading;
  try {
    reading = await getReadingView(id, actor);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") notFound();
    throw error;
  }

  if (reading.status !== "COMPLETE" || !reading.interpretation) {
    return <ReadingStatusPanel reading={reading} />;
  }

  return (
    <>
      <TrackOnMount event="reading_viewed" properties={{ premium: reading.premium }} />
      {checkout ? (
        <div className="mx-auto max-w-5xl px-4 pt-6 sm:px-6">
          {checkout === "success" && reading.premium ? (
            <Alert tone="success">Thank you — your full report is unlocked.</Alert>
          ) : checkout === "success" ? (
            <Alert tone="info">
              Your payment is being confirmed. This usually takes a few seconds — refresh the page
              shortly.
            </Alert>
          ) : (
            <Alert tone="info">Checkout was cancelled. You have not been charged.</Alert>
          )}
        </div>
      ) : null}
      <ResultsDashboard
        reading={reading}
        priceLabel={premiumPrice().label}
        paymentsEnabled={paymentsEnabled()}
        signedIn={Boolean(actor.user)}
      />
    </>
  );
}
