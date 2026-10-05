import type { MountName } from "@/lib/schemas/palm-analysis";
import type { Category, PalmistryRule } from "./types";

export type MountProminence = "flat" | "moderate" | "prominent";
type MountRule = PalmistryRule<MountProminence>;

const MOUNT_CAVEAT =
  "Mounts are judged from the fleshy pads of the palm, which are hard to assess in a flat photo, so this is an approximate reading.";

function mountRules(
  mount: MountName,
  config: {
    prominent: { category: Category; trait: string; traditional: string; shadow?: string };
    flat: { category: Category; trait: string; traditional: string };
    meaning: string;
  },
): MountRule[] {
  return [
    {
      id: `${mount}.prominent`,
      category: config.prominent.category,
      trait: config.prominent.trait,
      appliesTo: (p) => p === "prominent",
      traditional: config.prominent.traditional,
      explanation: config.meaning,
      confidenceConsiderations: MOUNT_CAVEAT,
      shadow: config.prominent.shadow,
    },
    {
      id: `${mount}.moderate`,
      category: config.prominent.category,
      trait: "balanced",
      appliesTo: (p) => p === "moderate",
      traditional: `A moderately developed ${mountName(mount)} is traditionally read as a balanced expression of its qualities.`,
      explanation: config.meaning,
      confidenceConsiderations: MOUNT_CAVEAT,
    },
    {
      id: `${mount}.flat`,
      category: config.flat.category,
      trait: config.flat.trait,
      appliesTo: (p) => p === "flat",
      traditional: config.flat.traditional,
      explanation: config.meaning,
      confidenceConsiderations: MOUNT_CAVEAT,
    },
  ];
}

function mountName(mount: MountName): string {
  const names: Record<MountName, string> = {
    venus: "Mount of Venus",
    jupiter: "Mount of Jupiter",
    saturn: "Mount of Saturn",
    apollo: "Mount of Apollo",
    mercury: "Mount of Mercury",
    mars: "Mount of Mars",
    moon: "Mount of Moon",
  };
  return names[mount];
}

export const MOUNT_RULES: Record<MountName, MountRule[]> = {
  venus: mountRules("venus", {
    meaning:
      "The Mount of Venus, at the base of the thumb, is traditionally linked with affection, warmth and enjoyment of life's pleasures.",
    prominent: {
      category: "relationships",
      trait: "affectionate",
      traditional:
        "A full Mount of Venus is traditionally associated with warmth, affection and a strong appreciation of beauty and comfort.",
      shadow: "Palmists sometimes add that a love of comfort is best balanced with moderation.",
    },
    flat: {
      category: "personality",
      trait: "reserved",
      traditional:
        "A flatter Mount of Venus is traditionally read as a more reserved, cerebral approach to affection.",
    },
  }),
  jupiter: mountRules("jupiter", {
    meaning:
      "The Mount of Jupiter, below the index finger, is traditionally linked with ambition, confidence and leadership.",
    prominent: {
      category: "career",
      trait: "ambitious",
      traditional:
        "A well-developed Mount of Jupiter is traditionally associated with ambition, confidence and a natural inclination to lead.",
      shadow: "Traditionally, strong ambition is balanced by listening as well as leading.",
    },
    flat: {
      category: "challenges",
      trait: "modest",
      traditional:
        "A flatter Mount of Jupiter is traditionally read as modesty — someone who may underplay their own ambitions.",
    },
  }),
  saturn: mountRules("saturn", {
    meaning:
      "The Mount of Saturn, below the middle finger, is traditionally linked with responsibility, patience and reflection.",
    prominent: {
      category: "personality",
      trait: "responsible",
      traditional:
        "A pronounced Mount of Saturn is traditionally associated with responsibility, patience and a love of study or solitude.",
      shadow:
        "A serious, responsible streak is traditionally balanced by making time for lightness and play.",
    },
    flat: {
      category: "personality",
      trait: "easygoing",
      traditional:
        "A flatter Mount of Saturn is traditionally read as an easygoing, sociable outlook.",
    },
  }),
  apollo: mountRules("apollo", {
    meaning:
      "The Mount of Apollo (or Sun), below the ring finger, is traditionally linked with creativity, joy and self-expression.",
    prominent: {
      category: "strengths",
      trait: "creative",
      traditional:
        "A full Mount of Apollo is traditionally associated with creativity, charm and appreciation of the arts.",
      shadow: "Palmists note that a creative spirit can be hard on its own work — patience helps.",
    },
    flat: {
      category: "personality",
      trait: "practical",
      traditional:
        "A flatter Mount of Apollo is traditionally read as practicality over showmanship.",
    },
  }),
  mercury: mountRules("mercury", {
    meaning:
      "The Mount of Mercury, below the little finger, is traditionally linked with communication, wit and commerce.",
    prominent: {
      category: "money",
      trait: "persuasive",
      traditional:
        "A developed Mount of Mercury is traditionally associated with communication skills, quick wit and a head for business.",
      shadow: "A quick wit is traditionally balanced by pausing to listen before persuading.",
    },
    flat: {
      category: "challenges",
      trait: "quiet",
      traditional:
        "A flatter Mount of Mercury is traditionally read as someone who prefers listening to persuading.",
    },
  }),
  mars: mountRules("mars", {
    meaning:
      "The Mounts of Mars are traditionally linked with courage, determination and resilience.",
    prominent: {
      category: "strengths",
      trait: "courageous",
      traditional:
        "A firm Mount of Mars is traditionally associated with courage, persistence and standing up for what matters.",
      shadow: "Courage is traditionally balanced by choosing which battles truly matter.",
    },
    flat: {
      category: "personality",
      trait: "peaceable",
      traditional:
        "A flatter Mount of Mars is traditionally read as a preference for harmony over confrontation.",
    },
  }),
  moon: mountRules("moon", {
    meaning:
      "The Mount of Moon, on the outer palm above the wrist, is traditionally linked with imagination and intuition.",
    prominent: {
      category: "personality",
      trait: "intuitive",
      traditional:
        "A full Mount of Moon is traditionally associated with a rich imagination, intuition and an inner world.",
      shadow:
        "A vivid inner world is traditionally balanced by grounding daydreams in small, practical steps.",
    },
    flat: {
      category: "personality",
      trait: "grounded",
      traditional:
        "A flatter Mount of Moon is traditionally read as a grounded, realistic outlook.",
    },
  }),
};
