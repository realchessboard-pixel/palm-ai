import { T } from "@/components/i18n/i18n";
import type { ReadingMessages } from "@/lib/i18n/reading-messages";
import type { ReadingView } from "@/lib/readings/view";

/**
 * Transparency without getting in the way: how clearly the photo showed each
 * feature. Collapsed by default, below the reading — these numbers describe
 * the photo, never how "true" an interpretation is.
 */
export function AnalysisDetails({
  reading,
  messages,
}: {
  reading: ReadingView;
  messages: ReadingMessages;
}) {
  if (reading.features.length === 0 && reading.analysisConfidence === null) return null;
  const pct = (v: number) => `${Math.round(v * 100)}%`;
  return (
    <details className="group card rounded-2xl px-5 py-1 text-sm open:pb-5 sm:px-6">
      <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-3 text-mist hover:text-parchment [&::-webkit-details-marker]:hidden">
        {messages.analysisDetails}
        <span
          aria-hidden="true"
          className="inline-flex size-6 items-center justify-center rounded-full border border-white/10 text-gold-300 transition-transform group-open:rotate-45"
        >
          +
        </span>
      </summary>
      <div className="space-y-4 pt-2">
        <p className="text-xs leading-relaxed text-mist">{messages.analysisIntro}</p>
        {reading.analysisConfidence !== null ? (
          <p className="text-parchment/85">
            {messages.imageClarity} · {pct(reading.analysisConfidence)}
          </p>
        ) : null}
        {reading.features.length > 0 ? (
          <ul className="flex flex-wrap gap-2" aria-label={messages.analysisDetails}>
            {reading.features.map((f) => (
              <li
                key={f.key}
                className="rounded-full border border-white/10 bg-white/[0.03] px-3 py-1.5 text-xs text-mist"
              >
                <span className="text-parchment/90">
                  <T s={f.label} />
                </span>{" "}
                · {pct(f.confidence)}
              </li>
            ))}
          </ul>
        ) : null}
        {reading.handCheck?.strongMismatch ? (
          <p className="text-xs leading-relaxed text-mist">{messages.handNote}</p>
        ) : null}
      </div>
    </details>
  );
}
