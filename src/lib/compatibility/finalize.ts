import { availableFeatures } from "@/lib/palmistry/features";
import { matchRules } from "@/lib/palmistry/interpretation";
import type { MatchedRule } from "@/lib/palmistry/types";
import { sanitizeText } from "@/lib/pipeline/safety";
import type { PalmAnalysis } from "@/lib/schemas/palm-analysis";
import {
  COMPATIBILITY_PART_IDS,
  CompatibilityReadingSchema,
  type CompatibilityPartId,
  type CompatibilityReading,
} from "./schema";

/** A couple reading never touches marriage, break-ups or horoscope matching. */
const COUPLE_BLOCKED =
  /\b(marry|marries|marriage|married|wedding|engage(?:d|ment)|break ?ups?|separat\w*|kundl[ai]|kundali|guna|gun milan|horoscope|soul ?mates?|meant to be|perfect match|bad match|compatibility score|\d{1,3} ?%)/i;

function cleanText(text: string): { text: string; removed: number } {
  const safe = sanitizeText(text);
  let removed = safe.removed;
  const paragraphs = safe.text.split(/\n{2,}/).map((p) =>
    (p.match(/[^.!?]+[.!?]*["')\]]*\s*/g) ?? [p])
      .filter((sentence) => {
        if (COUPLE_BLOCKED.test(sentence)) {
          removed++;
          return false;
        }
        return true;
      })
      .join("")
      .trim(),
  );
  return { text: paragraphs.filter(Boolean).join("\n\n"), removed };
}

/**
 * Keep only citations of features each person actually showed, drop passages
 * left without any, and remove unsafe sentences. Returns null if too little
 * remains to be a reading.
 */
export function finalizeCompatibility(
  raw: CompatibilityReading,
  you: PalmAnalysis,
  partner: PalmAnalysis,
): { reading: CompatibilityReading; removed: number; invalidCitations: number } | null {
  const seen = { you: availableFeatures(you), partner: availableFeatures(partner) };
  let removed = 0;
  let invalidCitations = 0;
  const cite = (basedOn: string[]) =>
    basedOn.filter((c) => {
      const [who, ...rest] = c.split(".");
      const ok = (seen[who as "you" | "partner"] as Map<string, number> | undefined)?.has(
        rest.join("."),
      );
      if (!ok) invalidCitations++;
      return ok;
    });
  const clean = (text: string) => {
    const r = cleanText(text);
    removed += r.removed;
    return r.text;
  };

  const parts = raw.parts.flatMap((p) => {
    const basedOn = cite(p.basedOn);
    const text = clean(p.text);
    if (!basedOn.length || !text) {
      removed++;
      return [];
    }
    return [{ ...p, basedOn, text }];
  });
  const strengths = raw.strengths.flatMap((s) => {
    const basedOn = cite(s.basedOn);
    const text = clean(s.text);
    const name = clean(s.name);
    if (!basedOn.length || !text || !name) return [];
    return [{ name, text, basedOn }];
  });
  const reflection = raw.reflection
    ? (() => {
        const basedOn = cite(raw.reflection.basedOn);
        const text = clean(raw.reflection.text);
        return basedOn.length && text ? { ...raw.reflection, basedOn, text } : null;
      })()
    : null;

  const reading = {
    headline: clean(raw.headline) || "Two palms, read side by side",
    introduction:
      clean(raw.introduction) ||
      "Here is how traditional palmistry reads your two palms together — for reflection, not prediction.",
    parts: parts.sort(
      (a, b) => COMPATIBILITY_PART_IDS.indexOf(a.id) - COMPATIBILITY_PART_IDS.indexOf(b.id),
    ),
    strengths,
    reflection,
  };
  if (reading.parts.length === 0) return null;
  const parsed = CompatibilityReadingSchema.safeParse(reading);
  return parsed.success ? { reading: parsed.data, removed, invalidCitations } : null;
}

const PART_CATEGORIES: Record<CompatibilityPartId, MatchedRule["category"][]> = {
  minds: ["personality"],
  hearts: ["relationships"],
  everyday: ["strengths", "career"],
  growth: ["lifePath", "challenges"],
};

const lower = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

/**
 * Deterministic couple reading from the curated rules — used in demo mode
 * (sample features) and as a fallback, so the feature works without an AI key.
 */
export function composeRuleBasedCompatibility(
  you: PalmAnalysis,
  partner: PalmAnalysis,
): CompatibilityReading {
  const rules = { you: matchRules(you), partner: matchRules(partner) };
  const pick = (who: "you" | "partner", categories: MatchedRule["category"][]) =>
    rules[who].find((r) => categories.includes(r.category));
  const cites = (who: "you" | "partner", r: MatchedRule | undefined) =>
    r ? r.features.slice(0, 3).map((f) => `${who}.${f}`) : [];

  const parts = COMPATIBILITY_PART_IDS.flatMap((id) => {
    const a = pick("you", PART_CATEGORIES[id]);
    const b = pick("partner", PART_CATEGORIES[id]);
    if (!a && !b) return [];
    const text = [
      a ? `In your palm, ${lower(a.traditional)}` : null,
      b ? `In your partner's palm, ${lower(b.traditional)}` : null,
      a && b
        ? a.trait === b.trait
          ? `Traditionally, a shared ${a.trait} quality is read as common ground — something the two of you can lean on.`
          : `Traditionally, ${a.trait} on one side and ${b.trait} on the other are read as a balance, each offering what the other may reach for less often.`
        : null,
    ]
      .filter(Boolean)
      .join(" ");
    return [{ id, text, basedOn: [...cites("you", a), ...cites("partner", b)] }];
  });

  const strengths = [...rules.you, ...rules.partner]
    .filter((r) => r.category === "strengths" || r.category === "personality")
    .slice(0, 4)
    .map((r) => ({
      name: r.trait.slice(0, 40).replace(/^./, (c) => c.toUpperCase()),
      text: r.traditional,
      basedOn: cites(rules.you.includes(r) ? "you" : "partner", r),
    }));

  const shadow = [...rules.you, ...rules.partner].find((r) => r.shadow);
  return {
    headline: "Two palms, read side by side",
    introduction:
      "Looking at your two right palms together, the first thing tradition notices is how each hand carries its own character — and where the two meet.\n\nThis is traditional Indian palmistry, Hasta Samudrika Shastra, offered for reflection and conversation, not prediction.",
    parts,
    strengths,
    reflection: shadow
      ? {
          title: "Giving each other room",
          text: shadow.shadow!,
          basedOn: cites(rules.you.includes(shadow) ? "you" : "partner", shadow),
        }
      : null,
  };
}
