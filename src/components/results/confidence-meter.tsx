export function ConfidenceMeter({ value }: { value: number | null }) {
  const pct = value === null ? null : Math.round(value * 100);
  const radius = 34;
  const circumference = 2 * Math.PI * radius;
  const offset = pct === null ? circumference : circumference * (1 - pct / 100);
  const tone = pct === null ? "—" : pct >= 75 ? "High" : pct >= 50 ? "Moderate" : "Low";

  return (
    <div className="flex items-center gap-4">
      <svg viewBox="0 0 80 80" className="size-20 shrink-0 -rotate-90" aria-hidden="true">
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="rgb(255 255 255 / 0.08)"
          strokeWidth="7"
        />
        <circle
          cx="40"
          cy="40"
          r={radius}
          fill="none"
          stroke="url(#conf-g)"
          strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
        />
        <defs>
          <linearGradient id="conf-g" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#f6e0ad" />
            <stop offset="1" stopColor="#d29a3b" />
          </linearGradient>
        </defs>
      </svg>
      <div>
        <p className="text-sm text-mist">Image Analysis Confidence</p>
        <p className="font-display text-3xl text-parchment">
          {pct === null ? "—" : `${pct}%`}
          <span className="ml-2 align-middle font-sans text-xs text-mist">{tone}</span>
        </p>
        <p className="mt-0.5 max-w-xs text-xs leading-snug text-mist-dim">
          How clearly the AI could see your palm&apos;s features — not the accuracy of any
          prediction.
        </p>
      </div>
    </div>
  );
}
