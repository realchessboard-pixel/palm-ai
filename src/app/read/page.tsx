import type { Metadata } from "next";
import { ReadingFlow } from "@/components/reading-flow/reading-flow";
import { Disclaimer } from "@/components/ui/disclaimer";

export const metadata: Metadata = {
  title: "Start Your Palm Reading",
  description:
    "Choose a hand, take or upload a photo of your palm, and receive an AI palmistry reading.",
  alternates: { canonical: "/read" },
};

export default function ReadPage() {
  return (
    <div className="px-4 pt-8 pb-20 sm:px-6 sm:pt-14">
      <ReadingFlow />
      <Disclaimer compact className="mx-auto mt-12 max-w-xl" />
    </div>
  );
}
