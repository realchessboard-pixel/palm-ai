import type { Metadata } from "next";
import { siteConfig } from "@/lib/config/site";

export const metadata: Metadata = {
  title: "How readings are made",
  alternates: { canonical: "/how-readings-work" },
};

const CLAUSES: [string, string][] = [
  [
    "Calculations",
    "Kundli, Kundli Milan, panchang, dasha and transit dates are calculated with standard astronomical methods (Lahiri ayanamsa).",
  ],
  [
    "Written readings",
    `Readings, Mahakundli answers and rashifal are written by ${siteConfig.name}'s AI system from your chart or palm photo, following traditional Jyotish and Hasta Samudrika Shastra, and checked by automatic safety filters.`,
  ],
  [
    "Readers",
    "Our readers (Meera, Acharya Dev and others) are AI characters, each with its own style. Their portraits are illustrations, not real people.",
  ],
  [
    "Palm photos",
    "Your photo is analysed automatically to observe lines and mounts. It is stored privately and never used for training unless you opt in.",
  ],
  [
    "Nature of readings",
    "Astrology and palmistry are traditions, not sciences. Readings are for reflection and entertainment, not predictions, and not medical, legal, financial or relationship advice.",
  ],
];

export default function HowReadingsWorkPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <h1 className="text-2xl">How readings are made</h1>
      <dl className="mt-6 space-y-4 text-xs leading-relaxed text-mist">
        {CLAUSES.map(([k, v], i) => (
          <div key={k}>
            <dt className="font-semibold text-parchment">
              {i + 1}. {k}
            </dt>
            <dd className="mt-1">{v}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
