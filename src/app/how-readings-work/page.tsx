import { msg } from "@/lib/i18n/msg";
import { getT } from "@/lib/i18n/server";
import { T } from "@/components/i18n/i18n";
import type { Metadata } from "next";

export async function generateMetadata(): Promise<Metadata> {
  const tx = await getT();
  return {
    title: tx("How readings are made"),
    alternates: { canonical: "/how-readings-work" },
  };
}

const CLAUSES: [string, string][] = [
  [
    msg("Calculations"),
    msg(
      "Kundli, Kundli Milan, panchang, dasha and transit dates are calculated with standard astronomical methods (Lahiri ayanamsa).",
    ),
  ],
  [
    msg("Written readings"),
    msg(
      "Readings, Mahakundli answers and rashifal are written by AstroVidya's AI system from your chart or palm photo, following traditional Jyotish and Hasta Samudrika Shastra, and checked by automatic safety filters.",
    ),
  ],
  [
    msg("Readers"),
    msg(
      "Our readers (Meera, Acharya Dev and others) are AI characters, each with its own style. Their portraits are illustrations, not real people.",
    ),
  ],
  [
    msg("Palm photos"),
    msg(
      "Your photo is analysed automatically to observe lines and mounts. It is stored privately and never used for training unless you opt in.",
    ),
  ],
  [
    msg("Nature of readings"),
    msg(
      "Astrology and palmistry are traditions, not sciences. Readings are for reflection and entertainment, not predictions, and not medical, legal, financial or relationship advice.",
    ),
  ],
];

export default function HowReadingsWorkPage() {
  return (
    <div className="mx-auto max-w-2xl px-4 pt-10 pb-20 sm:px-6 sm:pt-14">
      <h1 className="text-2xl">
        <T s="How readings are made" />
      </h1>
      <dl className="mt-6 space-y-4 text-xs leading-relaxed text-mist">
        {CLAUSES.map(([k, v], i) => (
          <div key={k}>
            <dt className="font-semibold text-parchment">
              {i + 1}. <T s={k} />
            </dt>
            <dd className="mt-1">
              <T s={v} />
            </dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
