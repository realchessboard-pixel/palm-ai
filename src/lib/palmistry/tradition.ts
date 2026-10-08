import type { LineName, MountName } from "@/lib/schemas/palm-analysis";
import type { FeatureKey } from "./features";

/**
 * Traditional Indian palmistry (Hasta Samudrika Shastra) vocabulary and the
 * structure used to ground readings in it.
 *
 * Provenance matters: everything in this layer is a curated SUMMARY of
 * interpretations commonly taught in Indian palmistry. It is not quoted from
 * any specific book, and nothing here may be presented as a citation. When a
 * verified text becomes available, add it to KNOWLEDGE_SOURCES with real
 * bibliographic details and point the relevant rules at it.
 */
export interface KnowledgeSource {
  id: string;
  title: string;
  kind: "curated-summary" | "verified-text";
  /** True only for sources whose wording and attribution have been checked. */
  verified: boolean;
  note: string;
}

export const KNOWLEDGE_SOURCES = [
  {
    id: "palmai-curated",
    title: "AstroVidya curated summaries of traditional palmistry interpretations",
    kind: "curated-summary",
    verified: false,
    note: "Paraphrased summaries of interpretations widely taught in Indian (Hasta Samudrika) and shared palmistry traditions. Not quotations; no specific book, author or verse is cited.",
  },
] as const satisfies readonly KnowledgeSource[];

export type KnowledgeSourceId = (typeof KNOWLEDGE_SOURCES)[number]["id"];
export const DEFAULT_SOURCE: KnowledgeSourceId = "palmai-curated";

/** Traditional Indian names for the mounts (parvat) and their planetary rulers. */
export interface ParvatInfo {
  /** Romanised name, e.g. "Guru Parvat". */
  name: string;
  hindi: string;
  /** Western name for readers who know that tradition. */
  western: string;
  planet: string;
  /** Qualities traditionally associated with the planet that rules the mount. */
  themes: string;
}

export const PARVATS: Record<MountName, ParvatInfo> = {
  jupiter: {
    name: "Guru Parvat",
    hindi: "गुरु पर्वत",
    western: "Mount of Jupiter",
    planet: "Guru (Jupiter)",
    themes: "wisdom, leadership, ambition, guidance and a sense of dharma",
  },
  saturn: {
    name: "Shani Parvat",
    hindi: "शनि पर्वत",
    western: "Mount of Saturn",
    planet: "Shani (Saturn)",
    themes: "discipline, responsibility, patience and seriousness of purpose",
  },
  apollo: {
    name: "Surya Parvat",
    hindi: "सूर्य पर्वत",
    western: "Mount of the Sun (Apollo)",
    planet: "Surya (Sun)",
    themes: "creativity, self-expression, recognition and warmth",
  },
  mercury: {
    name: "Budha Parvat",
    hindi: "बुध पर्वत",
    western: "Mount of Mercury",
    planet: "Budha (Mercury)",
    themes: "communication, intellect, commerce and quick thinking",
  },
  venus: {
    name: "Shukra Parvat",
    hindi: "शुक्र पर्वत",
    western: "Mount of Venus",
    planet: "Shukra (Venus)",
    themes: "affection, beauty, comfort, the arts and the warmth of relationships",
  },
  moon: {
    name: "Chandra Parvat",
    hindi: "चंद्र पर्वत",
    western: "Mount of the Moon",
    planet: "Chandra (Moon)",
    themes: "imagination, intuition, sensitivity and a love of travel",
  },
  mars: {
    name: "Mangal Parvat",
    hindi: "मंगल पर्वत",
    western: "Mount of Mars",
    planet: "Mangal (Mars)",
    themes: "courage, energy, resilience and self-assertion",
  },
};

/** Traditional Indian names for the major lines (rekha). */
export const REKHAS: Record<LineName, { name: string; hindi: string }> = {
  heart: { name: "Hridaya Rekha", hindi: "हृदय रेखा" },
  head: { name: "Mastishka Rekha", hindi: "मस्तिष्क रेखा" },
  life: { name: "Jeevan Rekha", hindi: "जीवन रेखा" },
  fate: { name: "Bhagya Rekha", hindi: "भाग्य रेखा" },
};

/** The parts of the main (free) reading. */
export const NARRATIVE_PARTS = ["thinking", "caring", "career"] as const;
export type NarrativePart = (typeof NARRATIVE_PARTS)[number];

/**
 * Which observations a traditional reader combines for each part of the
 * reading. A conclusion should draw on several of these together, never on
 * one weak feature alone.
 */
export const COMBINATIONS: Record<NarrativePart, { features: FeatureKey[]; guide: string }> = {
  thinking: {
    features: [
      "lines.head",
      "palmShape",
      "fingers",
      "fingers.thumb",
      "mounts.mercury",
      "mounts.moon",
    ],
    guide:
      "Read the Mastishka Rekha (head line) together with the hand shape, the fingers and the thumb, and Budha and Chandra Parvat where seen, to describe how the person thinks, decides and imagines.",
  },
  caring: {
    features: ["lines.heart", "mounts.venus", "mounts.moon", "lines.life"],
    guide:
      "Read the Hridaya Rekha (heart line) together with Shukra Parvat, and Chandra Parvat where seen, to describe how the person feels, gives affection and lets people close.",
  },
  career: {
    features: [
      "lines.fate",
      "mounts.saturn",
      "mounts.jupiter",
      "mounts.apollo",
      "mounts.mercury",
      "lines.head",
      "fingers.thumb",
    ],
    guide:
      "Read the Bhagya Rekha (fate line), if visible, with Shani, Guru, Surya and Budha Parvat, the head line and the thumb, to describe the person's working nature, ambition and the kinds of work traditionally said to suit them. Never predict jobs, promotions or income.",
  },
};

export function parvatLabel(mount: MountName): string {
  const p = PARVATS[mount];
  return `${p.name} (${p.western})`;
}
