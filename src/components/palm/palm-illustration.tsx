import { LINE_NAMES, MOUNT_NAMES } from "@/lib/schemas/palm-analysis";
import { PALM_LINES, PALM_MOUNTS, PALM_OUTLINE, PALM_VIEWBOX } from "./palm-geometry";

/** Decorative animated palm used on the landing page. Pure SVG, no images. */
export function PalmIllustration({ className }: { className?: string }) {
  return (
    <svg
      viewBox={PALM_VIEWBOX}
      className={className}
      role="img"
      aria-label="Illustration of an open palm with its major palmistry lines glowing in gold"
    >
      <defs>
        <linearGradient id="hero-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#2a2240" stopOpacity="0.95" />
          <stop offset="1" stopColor="#140f20" stopOpacity="0.95" />
        </linearGradient>
        <linearGradient id="hero-stroke" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#f6e0ad" />
          <stop offset="0.5" stopColor="#e5b45e" />
          <stop offset="1" stopColor="#9d8cf5" />
        </linearGradient>
        <filter id="hero-glow" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="hero-halo" cx="0.5" cy="0.55" r="0.5">
          <stop offset="0" stopColor="#e5b45e" stopOpacity="0.22" />
          <stop offset="1" stopColor="#e5b45e" stopOpacity="0" />
        </radialGradient>
      </defs>

      <circle cx="150" cy="230" r="170" fill="url(#hero-halo)" className="animate-glow" />
      <circle
        cx="150"
        cy="230"
        r="150"
        fill="none"
        stroke="#e5b45e"
        strokeOpacity="0.15"
        strokeDasharray="2 8"
        className="origin-[150px_230px] animate-spin-slow"
      />

      <path d={`${PALM_OUTLINE} Z`} fill="url(#hero-fill)" />
      <path
        d={PALM_OUTLINE}
        fill="none"
        stroke="url(#hero-stroke)"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
        filter="url(#hero-glow)"
        opacity="0.9"
      />

      <g filter="url(#hero-glow)">
        {LINE_NAMES.map((line, index) => (
          <path
            key={line}
            d={PALM_LINES[line].d}
            pathLength={1}
            fill="none"
            stroke="#efcb83"
            strokeWidth={line === "fate" ? 1.6 : 2.4}
            strokeLinecap="round"
            className="draw-path"
            style={{ animationDelay: `${0.4 + index * 0.35}s` }}
          />
        ))}
      </g>

      {MOUNT_NAMES.map((mount, index) => (
        <circle
          key={mount}
          cx={PALM_MOUNTS[mount].x}
          cy={PALM_MOUNTS[mount].y}
          r="2.2"
          fill="#f6e0ad"
          className="animate-twinkle"
          style={{ animationDelay: `${index * 0.6}s` }}
        />
      ))}
    </svg>
  );
}
