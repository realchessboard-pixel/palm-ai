import type { PalmShapeResult } from "@/lib/schemas/palm-analysis";
import type { FingersObservation } from "./fingers";
import type { PalmistryRule } from "./types";

export type PalmShapeObservation = Exclude<PalmShapeResult, "insufficient_visibility">;
export type Element = "earth" | "air" | "fire" | "water";

/**
 * The classic elemental hand types are DERIVED deterministically from the
 * observed palm proportion and finger length, rather than asking the model to
 * name an element — fewer opportunities to hallucinate.
 */
export function deriveElement(
  palm: PalmShapeObservation,
  fingers: FingersObservation,
): Element | null {
  if (fingers.relativeLength === "medium") return null;
  const longFingers = fingers.relativeLength === "long";
  if (palm.proportion === "square") return longFingers ? "air" : "earth";
  return longFingers ? "water" : "fire";
}

export const ELEMENT_DESCRIPTIONS: Record<
  Element,
  { title: string; traits: string; shadow: string }
> = {
  earth: {
    title: "Earth hand",
    traits: "practical, grounded and dependable",
    shadow:
      "Earth hands are traditionally said to value stability so much that change can feel unsettling.",
  },
  air: {
    title: "Air hand",
    traits: "curious, communicative and intellectually lively",
    shadow:
      "Air hands are traditionally said to live in their thoughts, so naming feelings can take practice.",
  },
  fire: {
    title: "Fire hand",
    traits: "energetic, enthusiastic and spontaneous",
    shadow:
      "Fire hands are traditionally said to start with great energy, so pacing and follow-through matter.",
  },
  water: {
    title: "Water hand",
    traits: "intuitive, sensitive and creative",
    shadow:
      "Water hands are traditionally said to absorb the moods around them, so quiet time to recharge helps.",
  },
};

export const ELEMENT_RULES: PalmistryRule<Element>[] = (
  Object.keys(ELEMENT_DESCRIPTIONS) as Element[]
).map((element) => ({
  id: `element.${element}`,
  category: "personality" as const,
  trait: ELEMENT_DESCRIPTIONS[element].traits.split(",")[0],
  appliesTo: (e: Element) => e === element,
  traditional: `Your palm proportions and finger length resemble what palmistry calls an ${ELEMENT_DESCRIPTIONS[element].title.toLowerCase()}, traditionally associated with being ${ELEMENT_DESCRIPTIONS[element].traits}.`,
  explanation:
    "Classical palmistry groups hands into four elemental types based on the shape of the palm and the length of the fingers.",
  confidenceConsiderations:
    "Elemental types are broad categories; many hands sit between two types.",
}));

export const PALM_SHAPE_RULES: PalmistryRule<PalmShapeObservation>[] = [
  {
    id: "palm.square",
    category: "career",
    trait: "methodical",
    appliesTo: (p) => p.proportion === "square",
    traditional:
      "A square palm is traditionally associated with a methodical, hands-on approach and an appreciation for structure.",
    explanation:
      "Palmists read the palm's proportions as your basic temperament and way of working.",
    confidenceConsiderations: "Palm proportions can be distorted by camera angle and distance.",
  },
  {
    id: "palm.rectangular",
    category: "personality",
    trait: "reflective",
    appliesTo: (p) => p.proportion === "rectangular",
    traditional:
      "A longer, rectangular palm is traditionally associated with sensitivity, imagination and a reflective nature.",
    explanation:
      "Palmists read the palm's proportions as your basic temperament and way of working.",
    confidenceConsiderations: "Palm proportions can be distorted by camera angle and distance.",
  },
];
