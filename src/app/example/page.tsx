import { getT } from "@/lib/i18n/server";
import type { Metadata } from "next";
import { ResultsDashboard } from "@/components/results/results-dashboard";
import { composeRuleBasedReading } from "@/lib/palmistry/interpretation";
import { sampleAnalysis } from "@/lib/palmistry/sample-analysis";
import { buildReadingView } from "@/lib/readings/build-view";
import { applyTexts, collectTexts } from "@/lib/readings/translation-texts";
import { translateParagraphs } from "@/lib/i18n/phrases";
import { getLanguage } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return {
    title: tx("Example Palm Reading"),
    description: tx(
      "See an example palm reading: heart, head, life and fate lines, mounts, fingers and traditional palmistry highlights.",
    ),
    alternates: { canonical: "/example" },
  };
}

export default async function ExampleReadingPage() {
  const lang = await getLanguage();
  const analysis = sampleAnalysis("right");
  // The sample reading's texts are part of the site's translated phrases.
  const english = composeRuleBasedReading(analysis);
  const texts = collectTexts(english);
  const interpretation = applyTexts(
    english,
    new Map([...texts].map(([id, text]) => [id, translateParagraphs(lang, text)])),
  );
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
    interpretation,
    premium: true,
    language: lang,
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
