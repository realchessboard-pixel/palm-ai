import { lineLabel } from "@/lib/palmistry/features";
import type { LockedContent } from "@/lib/readings/projection";
import { SECTION_TITLES } from "@/lib/schemas/palm-interpretation";
import { UnlockButton } from "./unlock-button";

/**
 * Describes what the full report contains for THIS reading. The content itself
 * is not sent to the browser until the reading is unlocked.
 */
export function PremiumPanel({
  readingId,
  locked,
  priceLabel,
  paymentsEnabled,
}: {
  readingId: string;
  locked: LockedContent;
  priceLabel: string;
  paymentsEnabled: boolean;
}) {
  const items = [
    ...locked.detailedSections.map((id) => `In-depth ${SECTION_TITLES[id].toLowerCase()} reading`),
    ...locked.sections.map((id) => SECTION_TITLES[id]),
    ...locked.lines.map((line) => `${lineLabel(line)} reading`),
    ...(locked.mountCount > 0
      ? [`${locked.mountCount} palm mount${locked.mountCount === 1 ? "" : "s"} interpreted`]
      : []),
    ...(locked.fingers ? ["Finger & thumb analysis"] : []),
    ...(locked.markings ? ["Minor markings"] : []),
    "Downloadable PDF report",
  ];

  return (
    <section
      aria-labelledby="premium-title"
      className="relative overflow-hidden rounded-[2rem] border border-gold-400/25 bg-gradient-to-b from-gold-400/[0.09] to-transparent p-6 sm:p-10"
    >
      <p className="text-xs font-semibold tracking-[0.2em] text-gold-300 uppercase">Full report</p>
      <h2 id="premium-title" className="mt-2 text-3xl text-parchment">
        Explore the rest of your reading
      </h2>
      <p className="mt-3 max-w-xl text-mist">
        Your full report is already prepared from the same photo. It includes everything below,
        grounded in the features we detected.
      </p>
      <ul className="mt-6 grid gap-2 sm:grid-cols-2">
        {items.map((item) => (
          <li key={item} className="flex items-start gap-2 text-sm text-parchment/90">
            <svg
              viewBox="0 0 20 20"
              className="mt-0.5 size-4 shrink-0 text-gold-300"
              aria-hidden="true"
            >
              <path
                d="M5 10.5l3 3 7-7"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
              />
            </svg>
            {item}
          </li>
        ))}
      </ul>
      <div className="mt-8">
        {paymentsEnabled ? (
          <UnlockButton readingId={readingId} priceLabel={priceLabel} />
        ) : (
          <p className="text-sm text-mist">
            Full reports aren&apos;t available for purchase right now.
          </p>
        )}
        <p className="mt-3 text-xs text-mist-dim">
          One-time payment for this reading. No subscription. Same entertainment-only disclaimer
          applies.
        </p>
      </div>
    </section>
  );
}
