import { cn } from "@/lib/cn";

/**
 * Where ads may appear for free users. Placements are deliberately limited to
 * finished, non-premium result pages — never the upload, analysis or loading
 * screens, and never inside the detailed reading.
 */
export const AD_PLACEMENTS = {
  "free-reading-result": "After the free basic reading, before the detailed-reading offer",
} as const;
export type AdPlacement = keyof typeof AD_PLACEMENTS;

/** "off" renders nothing; "placeholder" is a clearly-marked development box. */
export type AdMode = "off" | "placeholder";

/**
 * Ad boundary. No ad network is integrated: a future one plugs in here (behind
 * consent) without touching the reading flow.
 */
export function AdSlot({
  placement,
  mode,
  className,
}: {
  placement: AdPlacement;
  mode: AdMode;
  className?: string;
}) {
  if (mode === "off") return null;
  return (
    <aside
      aria-label="Advertisement placeholder"
      data-ad-placement={placement}
      className={cn(
        "rounded-3xl border border-dashed border-white/15 px-6 py-8 text-center text-xs text-mist-dim",
        className,
      )}
    >
      <p className="font-semibold tracking-[0.2em] uppercase">Development placeholder</p>
      <p className="mt-1">
        Ad slot “{placement}” — no ads are shown to users. {AD_PLACEMENTS[placement]}.
      </p>
    </aside>
  );
}
