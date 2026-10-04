import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { ResultsDashboard } from "@/components/results/results-dashboard";
import { ReadingStatusPanel } from "@/components/results/reading-status-panel";
import { getActor } from "@/lib/auth/actor";
import { isAppError } from "@/lib/http/errors";
import { paymentsEnabled, premiumPrice } from "@/lib/payments/pricing";
import { getReadingView } from "@/lib/readings/service";
import { IdSchema } from "@/lib/schemas/api";

export const metadata: Metadata = {
  title: "Your Palm Reading",
  // Readings are private: never index them.
  robots: { index: false, follow: false },
};

export default async function ReadingPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!IdSchema.safeParse(id).success) notFound();
  const actor = await getActor();

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
      <ResultsDashboard
        reading={reading}
        priceLabel={premiumPrice().label}
        paymentsEnabled={paymentsEnabled()}
        signedIn={Boolean(actor.user)}
      />
    </>
  );
}
