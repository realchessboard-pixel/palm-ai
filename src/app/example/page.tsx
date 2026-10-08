import type { Metadata } from "next";
import { ResultsDashboard } from "@/components/results/results-dashboard";
import { composeRuleBasedReading } from "@/lib/palmistry/interpretation";
import { sampleAnalysis } from "@/lib/palmistry/sample-analysis";
import { buildReadingView } from "@/lib/readings/build-view";

export const metadata: Metadata = {
  title: "Example Palm Reading",
  description:
    "See an example palm reading: heart, head, life and fate lines, mounts, fingers and traditional palmistry highlights.",
  alternates: { canonical: "/example" },
};

export default function ExampleReadingPage() {
  const analysis = sampleAnalysis("right");
  const reading = buildReadingView({
    reading: {
      id: "example",
      hand: "RIGHT",
      status: "COMPLETE",
      createdAt: new Date(),
      isDemo: false,
      imageKey: null,
      analysisConfidence: analysis.overallConfidence,
      rejectionReason: null,
    },
    analysis,
    interpretation: composeRuleBasedReading(analysis),
    premium: true,
  });

  return (
    <ResultsDashboard
      reading={reading}
      priceLabel=""
      paymentsEnabled={false}
      signedIn={false}
      sample
    />
  );
}
