import type { FingersResult } from "@/lib/schemas/palm-analysis";
import type { PalmistryRule } from "./types";

export type FingersObservation = Exclude<FingersResult, "insufficient_visibility">;
export type ThumbObservation = Exclude<FingersObservation["thumb"], "insufficient_visibility">;

const FINGER_CAVEAT =
  "Finger proportions are judged relative to the palm and can be distorted by camera angle.";
const THUMB_CAVEAT = "The thumb's size and angle change a lot with how relaxed the hand is.";

export const FINGER_RULES: PalmistryRule<FingersObservation>[] = [
  {
    id: "fingers.long",
    category: "personality",
    trait: "detail-minded",
    appliesTo: (f) => f.relativeLength === "long",
    traditional:
      "Long fingers are traditionally associated with patience, attention to detail and a thoughtful, refined approach.",
    explanation:
      "Palmists read finger length relative to the palm as how much you dwell on details versus the big picture.",
    confidenceConsiderations: FINGER_CAVEAT,
  },
  {
    id: "fingers.short",
    category: "personality",
    trait: "big-picture",
    appliesTo: (f) => f.relativeLength === "short",
    traditional:
      "Shorter fingers are traditionally associated with quick thinking, energy and a big-picture view.",
    explanation:
      "Palmists read shorter fingers as a preference for action and overview over fine detail.",
    confidenceConsiderations: FINGER_CAVEAT,
  },
  {
    id: "fingers.wide_spacing",
    category: "personality",
    trait: "independent",
    appliesTo: (f) => f.spacing === "wide",
    traditional:
      "Naturally wide-spread fingers are traditionally read as independence and openness to new ideas.",
    explanation: "How the hand falls open is interpreted as how freely you engage with the world.",
    confidenceConsiderations: "Spacing depends on how the hand was posed for the photo.",
  },
  {
    id: "fingers.close_spacing",
    category: "money",
    trait: "careful",
    appliesTo: (f) => f.spacing === "close",
    traditional:
      "Fingers held closer together are traditionally associated with caution and a careful approach to resources.",
    explanation: "Palmists read a closed hand posture as valuing security and planning.",
    confidenceConsiderations: "Spacing depends on how the hand was posed for the photo.",
  },
  {
    id: "fingers.index_longer",
    category: "career",
    trait: "confident",
    appliesTo: (f) => f.indexVsRing === "index_longer",
    traditional:
      "An index finger longer than the ring finger is traditionally linked with confidence and a desire to lead or organise.",
    explanation:
      "The index finger is associated with Jupiter — ambition and self-assurance — in palmistry.",
    confidenceConsiderations: "Small length differences are hard to judge from a single photo.",
  },
  {
    id: "fingers.ring_longer",
    category: "money",
    trait: "bold",
    appliesTo: (f) => f.indexVsRing === "ring_longer",
    traditional:
      "A ring finger longer than the index is traditionally associated with creativity and a willingness to take considered risks.",
    explanation: "The ring finger is associated with Apollo — creativity and flair — in palmistry.",
    confidenceConsiderations: "Small length differences are hard to judge from a single photo.",
  },
];

export const THUMB_RULES: PalmistryRule<ThumbObservation>[] = [
  {
    id: "thumb.large",
    category: "strengths",
    trait: "determined",
    appliesTo: (t) => t.size === "large",
    traditional: "A large thumb is traditionally associated with willpower and determination.",
    explanation:
      "In palmistry the thumb represents will and logic; its size reflects their strength.",
    confidenceConsiderations: THUMB_CAVEAT,
  },
  {
    id: "thumb.wide_angle",
    category: "personality",
    trait: "generous",
    appliesTo: (t) => t.angle === "wide",
    traditional:
      "A thumb that opens at a wide angle is traditionally read as generosity, openness and adaptability.",
    explanation:
      "Palmists read the thumb's natural angle as how readily you open up to people and ideas.",
    confidenceConsiderations: THUMB_CAVEAT,
  },
  {
    id: "thumb.narrow_angle",
    category: "personality",
    trait: "cautious",
    appliesTo: (t) => t.angle === "narrow",
    traditional:
      "A thumb held close to the hand is traditionally associated with caution and a reserved, private nature.",
    explanation: "Palmists read a narrow thumb angle as guarding one's energy and independence.",
    confidenceConsiderations: THUMB_CAVEAT,
  },
];
