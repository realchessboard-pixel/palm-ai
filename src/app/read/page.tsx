import type { Metadata } from "next";
import { connection } from "next/server";
import { ReadingFlow } from "@/components/reading-flow/reading-flow";
import { Disclaimer } from "@/components/ui/disclaimer";
import { adMode, rewardedAdUnit } from "@/lib/monetization/ads";

export const metadata: Metadata = {
  title: "Start Your Palm Reading",
  description:
    "Show us your right palm — take or upload a photo and receive a warm, personal reading rooted in traditional Indian palmistry.",
  alternates: { canonical: "/read" },
};

export default async function ReadPage() {
  // Ad settings are read per request (not baked in at build time).
  await connection();
  return (
    <div className="px-4 pt-8 pb-20 sm:px-6 sm:pt-14">
      <ReadingFlow adMode={adMode()} adUnit={rewardedAdUnit()} />
      <Disclaimer compact className="mx-auto mt-12 max-w-xl" />
    </div>
  );
}
