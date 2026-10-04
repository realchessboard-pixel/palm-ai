"use client";

import { PALM_OUTLINE, PALM_VIEWBOX } from "@/components/palm/palm-geometry";
import { cn } from "@/lib/cn";

export type Hand = "left" | "right";

function HandIcon({ hand }: { hand: Hand }) {
  return (
    <svg viewBox={PALM_VIEWBOX} className="h-28 w-auto" aria-hidden="true">
      <g transform={hand === "right" ? "translate(300 0) scale(-1 1)" : undefined}>
        <path d={`${PALM_OUTLINE} Z`} fill="rgb(255 255 255 / 0.04)" />
        <path
          d={PALM_OUTLINE}
          fill="none"
          stroke="currentColor"
          strokeWidth="5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </g>
    </svg>
  );
}

export function HandSelector({
  value,
  onChange,
}: {
  value: Hand | null;
  onChange: (hand: Hand) => void;
}) {
  const options: { hand: Hand; title: string; hint: string }[] = [
    { hand: "left", title: "Left hand", hint: "Traditionally your innate tendencies" },
    { hand: "right", title: "Right hand", hint: "Traditionally the path you're shaping" },
  ];
  return (
    <fieldset>
      <legend className="sr-only">Which hand would you like read?</legend>
      <div role="radiogroup" aria-label="Hand" className="grid grid-cols-2 gap-3 sm:gap-4">
        {options.map((option) => {
          const selected = value === option.hand;
          return (
            <button
              key={option.hand}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.hand)}
              className={cn(
                "flex flex-col items-center gap-3 rounded-3xl border p-5 text-center transition-all sm:p-7",
                selected
                  ? "border-gold-300/70 bg-gold-400/10 text-gold-200 shadow-[0_0_0_4px_rgb(229_180_94/0.12)]"
                  : "border-white/10 bg-white/[0.03] text-mist hover:border-white/25 hover:text-parchment",
              )}
            >
              <HandIcon hand={option.hand} />
              <span className="font-display text-xl text-parchment">{option.title}</span>
              <span className="text-xs leading-snug text-mist">{option.hint}</span>
            </button>
          );
        })}
      </div>
      <p className="mt-4 text-center text-xs text-mist-dim">
        Not sure? Many people choose their dominant hand. You can always read the other one later.
      </p>
    </fieldset>
  );
}
