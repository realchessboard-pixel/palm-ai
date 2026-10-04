import type { FeatureKey } from "./features";

/** Reading themes a rule can contribute to. */
export const CATEGORIES = [
  "personality",
  "relationships",
  "career",
  "money",
  "lifePath",
  "strengths",
  "challenges",
] as const;
export type Category = (typeof CATEGORIES)[number];

/**
 * One piece of traditional palmistry knowledge.
 *
 * Wording rules for every entry:
 *  - describe beliefs ("traditional palmistry associates…"), never facts;
 *  - no predictions of events, ages, health, lifespan, pregnancy or wealth;
 *  - no fear-based language.
 */
export interface PalmistryRule<Observation> {
  id: string;
  category: Category;
  /** Short adjective-like trait used for headlines and bullet points. */
  trait: string;
  appliesTo: (observation: Observation) => boolean;
  /** One-sentence traditional interpretation. */
  traditional: string;
  /** Why palmists read the feature this way. */
  explanation: string;
  /** What should temper confidence in this reading of the feature. */
  confidenceConsiderations: string;
  /**
   * Optional "flip side" of the trait, offered gently as an area for
   * reflection. Feeds the Challenges section.
   */
  shadow?: string;
}

export interface MatchedRule {
  id: string;
  category: Category;
  trait: string;
  traditional: string;
  explanation: string;
  confidenceConsiderations: string;
  shadow?: string;
  features: FeatureKey[];
  /** Detection confidence of the weakest feature the rule relies on. */
  confidence: number;
}
