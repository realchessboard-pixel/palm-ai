import { GRAHA_NAMES } from "@/lib/astro/constants";
import type { PlanetPosition } from "@/lib/astro/chart";

type Pt = [number, number];
const T: Pt = [200, 0];
const R: Pt = [400, 200];
const B: Pt = [200, 400];
const L: Pt = [0, 200];
const C: Pt = [200, 200];
const TL: Pt = [0, 0];
const TR: Pt = [400, 0];
const BR: Pt = [400, 400];
const BL: Pt = [0, 400];
const Q1: Pt = [100, 100];
const Q2: Pt = [300, 100];
const Q3: Pt = [300, 300];
const Q4: Pt = [100, 300];

/** House polygons of the North Indian chart, house 1 at the top centre, running anticlockwise. */
const HOUSES: Pt[][] = [
  [T, Q2, C, Q1],
  [TL, T, Q1],
  [TL, Q1, L],
  [L, Q1, C, Q4],
  [L, Q4, BL],
  [BL, Q4, B],
  [B, Q4, C, Q3],
  [B, Q3, BR],
  [BR, Q3, R],
  [R, Q3, C, Q2],
  [R, Q2, TR],
  [TR, Q2, T],
];

const centroid = (pts: Pt[]): Pt => [
  pts.reduce((n, p) => n + p[0], 0) / pts.length,
  pts.reduce((n, p) => n + p[1], 0) / pts.length,
];

/** North Indian (diamond) birth chart: houses fixed, signs placed from the lagna. */
export function NorthIndianChart({
  lagnaRashi,
  planets,
  title = "Birth chart (Lagna kundli)",
}: {
  lagnaRashi: number;
  planets: Pick<PlanetPosition, "graha" | "house" | "retrograde">[];
  title?: string;
}) {
  return (
    <svg viewBox="-4 -4 408 408" className="h-auto w-full max-w-md" role="img" aria-label={title}>
      <rect
        x="0"
        y="0"
        width="400"
        height="400"
        fill="var(--paper-raised)"
        stroke="var(--ink)"
        strokeWidth="2"
      />
      {HOUSES.map((pts, i) => (
        <polygon
          key={i}
          points={pts.map((p) => p.join(",")).join(" ")}
          fill={i === 0 ? "rgb(184 71 31 / 0.08)" : "none"}
          stroke="var(--ink)"
          strokeWidth="1.2"
        />
      ))}
      {HOUSES.map((pts, i) => {
        const [cx, cy] = centroid(pts);
        const sign = ((lagnaRashi + i) % 12) + 1;
        const inHouse = planets.filter((p) => p.house === i + 1);
        // Sign number sits towards the chart centre; planets around the centroid.
        const sx = cx + (200 - cx) * 0.35;
        const sy = cy + (200 - cy) * 0.35;
        return (
          <g key={`l${i}`} fontFamily="var(--font-sans)">
            <text
              x={sx}
              y={sy + 4}
              textAnchor="middle"
              fontSize="13"
              fill="#9c3b1b"
              fontWeight="600"
            >
              {sign}
            </text>
            {inHouse.map((p, j) => (
              <text
                key={p.graha}
                x={cx}
                y={cy - 10 + (j - (inHouse.length - 1) / 2) * 15 + (i === 0 ? -12 : 0)}
                textAnchor="middle"
                fontSize="13"
                fill="var(--ink)"
              >
                {GRAHA_NAMES[p.graha].short}
                {p.retrograde && p.graha !== "Rahu" && p.graha !== "Ketu" ? "(R)" : ""}
              </text>
            ))}
            {i === 0 ? (
              <text x={cx} y={cy + 26} textAnchor="middle" fontSize="11" fill="#9c3b1b">
                Lagna
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}
