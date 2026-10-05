import type { LineName, LineObservation } from "@/lib/schemas/palm-analysis";
import type { PalmistryRule } from "./types";

type LineRule = PalmistryRule<LineObservation>;

const curved = (l: LineObservation) => l.curvature === "moderate" || l.curvature === "wide";
const straightish = (l: LineObservation) => l.curvature === "straight" || l.curvature === "slight";

const PHOTO_CAVEAT =
  "Line length and depth can look different depending on lighting and how open the hand is, so treat this as a gentle indication.";

export const HEART_LINE_RULES: LineRule[] = [
  {
    id: "heart.long",
    category: "relationships",
    trait: "openhearted",
    appliesTo: (l) => l.length === "long",
    traditional:
      "Traditional palmistry associates a long heart line with emotional openness and a generous, expressive approach to relationships.",
    explanation:
      "The heart line is read as a map of how you give and receive affection; palmists see greater length as more room for emotional expression.",
    confidenceConsiderations: PHOTO_CAVEAT,
    shadow:
      "Palmists sometimes note that such an open heart can give a great deal, so protecting your own needs is worth remembering.",
  },
  {
    id: "heart.short",
    category: "relationships",
    trait: "selective",
    appliesTo: (l) => l.length === "short",
    traditional:
      "A shorter heart line is traditionally linked with a more private, selective way of sharing feelings — affection shown through actions more than words.",
    explanation:
      "Palmists read a heart line that ends earlier as emotions that are kept closer, offered deliberately to a trusted few.",
    confidenceConsiderations: PHOTO_CAVEAT,
  },
  {
    id: "heart.curved",
    category: "personality",
    trait: "warm",
    appliesTo: curved,
    traditional:
      "A curving heart line is traditionally read as warmth and a romantic, expressive nature that wears feelings openly.",
    explanation:
      "In palmistry the upward curve toward the fingers is associated with emotions that move outward toward other people.",
    confidenceConsiderations:
      "Curvature is one of the easier features to see, but hand posture can exaggerate it.",
    shadow:
      "The same expressiveness is traditionally said to make disappointments felt keenly — a reminder to be gentle with yourself.",
  },
  {
    id: "heart.straight",
    category: "personality",
    trait: "composed",
    appliesTo: straightish,
    traditional:
      "A straighter heart line is traditionally associated with a composed, thoughtful approach to feelings — heart guided by reason.",
    explanation:
      "Palmists read a level heart line as emotions that are processed inwardly before being expressed.",
    confidenceConsiderations:
      "A flattened hand in a photo can make a line look straighter than it is.",
    shadow:
      "Palmists suggest that a reasoned heart may occasionally hold back feelings others would love to hear.",
  },
  {
    id: "heart.deep",
    category: "strengths",
    trait: "loyal",
    appliesTo: (l) => l.depth === "deep",
    traditional:
      "A deep, clear heart line is traditionally associated with steady, loyal feelings and emotional depth.",
    explanation:
      "Palmists interpret line depth as the intensity and constancy of the energy the line represents.",
    confidenceConsiderations: "Depth is estimated from shading, which depends heavily on lighting.",
  },
  {
    id: "heart.faint",
    category: "challenges",
    trait: "sensitive",
    appliesTo: (l) => l.depth === "faint",
    traditional:
      "A fainter heart line is traditionally read as sensitivity — feelings that run quietly and may go unspoken.",
    explanation:
      "Palmists sometimes suggest that people with lighter heart lines benefit from voicing their needs more openly.",
    confidenceConsiderations: "Faint lines are the most affected by lighting and camera focus.",
  },
  {
    id: "heart.fork",
    category: "relationships",
    trait: "balanced",
    appliesTo: (l) => l.forks.length > 0,
    traditional:
      "A fork on the heart line is traditionally associated with balancing heart and head — being both caring and practical in love.",
    explanation: "Palmists read branching as a line's energy reaching in more than one direction.",
    confidenceConsiderations: "Small forks are easy to confuse with minor creases.",
  },
  {
    id: "heart.break",
    category: "challenges",
    trait: "adaptable",
    appliesTo: (l) => l.breaks === true,
    traditional:
      "A break in the heart line is traditionally read as a period of emotional change or recalibration, after which feelings find a new direction.",
    explanation: "Palmists interpret gaps as transitions rather than endings.",
    confidenceConsiderations: "Apparent breaks are often caused by skin creases or shadows.",
  },
];

export const HEAD_LINE_RULES: LineRule[] = [
  {
    id: "head.long",
    category: "career",
    trait: "thorough",
    appliesTo: (l) => l.length === "long",
    traditional:
      "Traditional palmistry associates a long head line with thorough, wide-ranging thinking and enjoyment of complex problems.",
    explanation:
      "The head line is read as your style of thinking; length is linked with considering many angles before deciding.",
    confidenceConsiderations: PHOTO_CAVEAT,
    shadow:
      "Traditionally, a mind that weighs every angle can sometimes find it hard to settle on a decision.",
  },
  {
    id: "head.short",
    category: "personality",
    trait: "decisive",
    appliesTo: (l) => l.length === "short",
    traditional:
      "A shorter head line is traditionally linked with quick, decisive thinking and a preference for practical action.",
    explanation: "Palmists read a compact head line as a mind that goes straight to the point.",
    confidenceConsiderations: PHOTO_CAVEAT,
    shadow:
      "The flip side palmists mention is a tendency to decide quickly before every detail is in.",
  },
  {
    id: "head.straight",
    category: "career",
    trait: "analytical",
    appliesTo: straightish,
    traditional:
      "A straight head line is traditionally associated with logical, analytical and practical thinking.",
    explanation:
      "In palmistry a level head line suggests thought that stays grounded in facts and structure.",
    confidenceConsiderations: "Posture can flatten or deepen the apparent slope of the head line.",
    shadow:
      "Palmists sometimes suggest leaving a little room for intuition alongside careful logic.",
  },
  {
    id: "head.curved",
    category: "personality",
    trait: "imaginative",
    appliesTo: curved,
    traditional:
      "A head line that curves downward is traditionally associated with imagination, creativity and intuitive thinking.",
    explanation:
      "Palmists read the slope toward the Mount of Moon as thinking drawn toward imagination.",
    confidenceConsiderations: "The degree of slope is approximate in a photo.",
    shadow:
      "A rich imagination is traditionally balanced by grounding routines that turn ideas into action.",
  },
  {
    id: "head.deep",
    category: "strengths",
    trait: "focused",
    appliesTo: (l) => l.depth === "deep",
    traditional:
      "A clear, well-defined head line is traditionally read as concentration and mental focus.",
    explanation: "Depth is interpreted as how steadily the line's energy flows.",
    confidenceConsiderations: "Depth is estimated from shading, which depends heavily on lighting.",
  },
  {
    id: "head.faint",
    category: "challenges",
    trait: "curious",
    appliesTo: (l) => l.depth === "faint",
    traditional:
      "A lighter head line is traditionally associated with a mind drawn to many interests at once, which can make focus a practice.",
    explanation:
      "Palmists sometimes suggest routines and priorities as a balance for this tendency.",
    confidenceConsiderations: "Faint lines are the most affected by lighting and camera focus.",
  },
  {
    id: "head.joined_life",
    category: "personality",
    trait: "considered",
    appliesTo: (l) => l.intersections.some((i) => /life/i.test(i)),
    traditional:
      "When the head line begins joined to the life line, palmistry traditionally reads a careful, considered approach to new situations.",
    explanation:
      "Palmists interpret the shared starting point as thought and caution developing together.",
    confidenceConsiderations:
      "Whether lines join or merely sit close is hard to judge from one photo.",
  },
  {
    id: "head.fork",
    category: "career",
    trait: "versatile",
    appliesTo: (l) => l.forks.some((f) => f.location === "end"),
    traditional:
      "A fork at the end of the head line — sometimes called the writer's fork — is traditionally associated with versatility and seeing things from more than one perspective.",
    explanation:
      "Palmists read the split as thinking that blends practical and imaginative approaches.",
    confidenceConsiderations: "Small forks are easy to confuse with minor creases.",
  },
  {
    id: "head.break",
    category: "lifePath",
    trait: "evolving",
    appliesTo: (l) => l.breaks === true,
    traditional:
      "A break in the head line is traditionally read as a shift in outlook or way of thinking at some point in life.",
    explanation: "Palmists treat gaps in a line as turning points rather than problems.",
    confidenceConsiderations: "Apparent breaks are often caused by skin creases or shadows.",
  },
];

export const LIFE_LINE_RULES: LineRule[] = [
  {
    id: "life.long",
    category: "lifePath",
    trait: "energetic",
    appliesTo: (l) => l.length === "long",
    traditional:
      "Traditional palmistry associates a long, sweeping life line with enthusiasm and steady energy. Palmists stress it says nothing about lifespan.",
    explanation:
      "Despite its name, the life line is read as vitality, lifestyle and major life changes — not length of life.",
    confidenceConsiderations: PHOTO_CAVEAT,
    shadow:
      "Plentiful energy is traditionally said to benefit from rest and pacing, so enthusiasm doesn't scatter.",
  },
  {
    id: "life.short",
    category: "lifePath",
    trait: "independent",
    appliesTo: (l) => l.length === "short",
    traditional:
      "A shorter life line is traditionally associated with independence and a self-directed approach to life. It is not a sign of a shorter life.",
    explanation: "Modern palmists are clear that life line length does not relate to lifespan.",
    confidenceConsiderations:
      "The end of the life line near the wrist is often outside the frame or in shadow.",
  },
  {
    id: "life.wide",
    category: "relationships",
    trait: "sociable",
    appliesTo: (l) => l.curvature === "wide" || l.curvature === "moderate",
    traditional:
      "A life line that sweeps widely around the thumb is traditionally linked with warmth, sociability and a zest for experiences.",
    explanation:
      "Palmists read the space the line gives the Mount of Venus as room for energy and affection.",
    confidenceConsiderations: "The arc's width depends on how far the thumb is extended.",
    shadow:
      "Palmists note that a sociable nature can sometimes say yes to more than it has time for.",
  },
  {
    id: "life.close",
    category: "personality",
    trait: "reserved",
    appliesTo: straightish,
    traditional:
      "A life line that hugs the thumb more closely is traditionally associated with a reserved nature and a preference for familiar surroundings.",
    explanation: "Palmists read a tighter arc as energy that is conserved and directed inward.",
    confidenceConsiderations: "A thumb held close to the hand can make the arc look tighter.",
    shadow:
      "The reflective side of this trait is that stepping outside familiar routines can feel like a stretch.",
  },
  {
    id: "life.deep",
    category: "strengths",
    trait: "resilient",
    appliesTo: (l) => l.depth === "deep",
    traditional:
      "A deep, clear life line is traditionally read as resilience and a steady, grounded presence.",
    explanation: "Depth is interpreted as the strength of the energy the line represents.",
    confidenceConsiderations: "Depth is estimated from shading, which depends heavily on lighting.",
  },
  {
    id: "life.break",
    category: "lifePath",
    trait: "adaptable",
    appliesTo: (l) => l.breaks === true,
    traditional:
      "A break in the life line is traditionally read as a significant change of lifestyle, place or direction — a fresh chapter.",
    explanation: "Palmists interpret gaps in the life line as transitions, never as danger.",
    confidenceConsiderations: "Apparent breaks are often caused by skin creases or shadows.",
  },
  {
    id: "life.fork",
    category: "lifePath",
    trait: "adventurous",
    appliesTo: (l) => l.forks.length > 0,
    traditional:
      "A fork in the life line is traditionally associated with a pull between home and new horizons, such as travel or relocation.",
    explanation: "Palmists read branches as energy reaching toward more than one way of living.",
    confidenceConsiderations: "Small forks are easy to confuse with minor creases.",
  },
];

export const FATE_LINE_RULES: LineRule[] = [
  {
    id: "fate.clear",
    category: "career",
    trait: "purposeful",
    appliesTo: (l) => l.depth === "deep" || l.depth === "moderate",
    traditional:
      "A clear fate line is traditionally associated with a strong sense of direction and commitment to a chosen path.",
    explanation: "The fate line is read as how you relate to work, duty and life direction.",
    confidenceConsiderations: "Fate lines vary greatly and are often partially hidden by creases.",
    shadow:
      "A strong sense of direction is traditionally balanced by staying open to unexpected detours.",
  },
  {
    id: "fate.faint",
    category: "career",
    trait: "self-directed",
    appliesTo: (l) => l.depth === "faint",
    traditional:
      "A faint fate line is traditionally read as a flexible, self-directed path shaped more by choice than by convention.",
    explanation: "Palmists see a light fate line as freedom to change course.",
    confidenceConsiderations: "Faint fate lines are frequently missed or over-read in photos.",
  },
  {
    id: "fate.break",
    category: "lifePath",
    trait: "reinventing",
    appliesTo: (l) => l.breaks === true,
    traditional:
      "Breaks in the fate line are traditionally associated with changes of career or direction — chapters that begin anew.",
    explanation: "Palmists interpret each segment as a different phase of working life.",
    confidenceConsiderations: "Apparent breaks are often caused by skin creases or shadows.",
  },
  {
    id: "fate.money",
    category: "money",
    trait: "steady",
    appliesTo: (l) => l.depth !== "faint" && l.breaks === false,
    traditional:
      "An unbroken fate line is traditionally associated with steady, consistent effort in building security — never a guarantee of any outcome.",
    explanation: "Palmists link consistency in the fate line with persistence in long-term goals.",
    confidenceConsiderations: "Fate lines vary greatly and are often partially hidden by creases.",
  },
];

export const LINE_RULES: Record<LineName, LineRule[]> = {
  heart: HEART_LINE_RULES,
  head: HEAD_LINE_RULES,
  life: LIFE_LINE_RULES,
  fate: FATE_LINE_RULES,
};
