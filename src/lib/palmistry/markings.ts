import type { MarkingType } from "@/lib/schemas/palm-analysis";

/** Traditional meanings of minor palm markings. Meanings depend on location. */
export const MARKING_MEANINGS: Record<MarkingType, { traditional: string; trait: string }> = {
  star: {
    trait: "spark",
    traditional:
      "A star is traditionally associated with moments of brilliance or recognition, with its meaning shaped by where it appears.",
  },
  cross: {
    trait: "decisive",
    traditional:
      "A cross is traditionally read as a point of decision or a challenge that encourages growth.",
  },
  island: {
    trait: "reflective",
    traditional:
      "An island is traditionally read as a period of divided energy or uncertainty that later resolves.",
  },
  triangle: {
    trait: "talented",
    traditional:
      "A triangle is traditionally associated with talent, learning and the ability to apply knowledge skilfully.",
  },
  square: {
    trait: "protected",
    traditional:
      "A square is traditionally considered a protective sign, associated with stability during times of change.",
  },
  grille: {
    trait: "busy",
    traditional:
      "A grille is traditionally read as scattered energy, inviting focus on what matters most.",
  },
  chain: {
    trait: "sensitive",
    traditional:
      "Chaining on a line is traditionally associated with fluctuating energy or sensitivity in that area of life.",
  },
  trident: {
    trait: "fortunate",
    traditional:
      "A trident is traditionally regarded as a favourable sign, associated with positive energy in the area where it appears.",
  },
};

export const MARKING_CAVEAT =
  "Small markings are easily confused with ordinary skin creases in photos, so these are the least certain observations.";
