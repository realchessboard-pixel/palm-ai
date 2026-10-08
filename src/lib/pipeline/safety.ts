import type { PalmInterpretation } from "@/lib/schemas/palm-interpretation";

/**
 * Content safety for generated readings. Sentences that make prohibited
 * claims are removed before anything is saved, regardless of what the model
 * was told. Some topics are acceptable only as explicit negations
 * ("this says nothing about lifespan").
 */
const ALWAYS_BLOCKED: RegExp[] = [
  /\b(die|dies|died|dying|death|deaths|deadly|fatal|mortal|mortality|early grave|pass(?:es)? away)\b/i,
  /\b(cancer|tumou?rs?|diabetes|heart attack|heart disease|stroke|illness(?:es)?|diseases?|disorders?|surgery|surgeries|infections?|chronic|symptoms?)\b/i,
  /\b(pregnan\w*|infertil\w*|fertility|miscarr\w*|conceive|conception)\b/i,
  /\b(criminal\w*|crimes?|prison|jail|arrest\w*|convict\w*|lawsuits?)\b/i,
  /\b(lottery|jackpot|millionaire|get rich)\b/i,
  /\b(divorce|widow\w*|affair)\b/i,
  // Fear-based astrology and paid remedies have no place in a reading.
  /\b(dosh(?:a|as)?|sade ?sati|manglik|kaal ?sarp\w*|remed(?:y|ies)|gemstones?|amulets?|talismans?)\b/i,
  /\bat (?:the )?age (?:of )?\d{1,3}\b/i,
  /\b(?:by|in|before|after) (?:the year )?(?:19|20)\d{2}\b/i,
  /\b(?:when you are|by the time you(?:'re| are)|in your) \d{1,2}s?\b/i,
  /\byou will (?:become|be|get|have|find|meet|marry|lose|win|earn|make)\b/i,
  /\b(?:destined|fated|doomed) to\b/i,
];

const BLOCKED_UNLESS_NEGATED: RegExp[] = [
  /\b(lifespan|life span|longevity|how long you(?:'ll| will) live)\b/i,
  /\b(guarantee\w*|certain(?:ly)? will|definitely will)\b/i,
  /\b(medical|diagnos\w*|health)\b/i,
  /\b(scientific\w*|scientifically proven|accurate prediction)\b/i,
];

const NEGATION = /\b(not|never|no|nothing|isn't|doesn't|don't|cannot|can't|without|rather than)\b/i;

export function isUnsafeSentence(sentence: string): boolean {
  if (ALWAYS_BLOCKED.some((re) => re.test(sentence))) return true;
  return BLOCKED_UNLESS_NEGATED.some((re) => re.test(sentence)) && !NEGATION.test(sentence);
}

function splitSentences(text: string): string[] {
  return text.match(/[^.!?\n]+(?:[.!?]+["')\]]*|\n+|$)/g)?.map((s) => s) ?? [text];
}

/** Remove unsafe sentences from a block of text. Returns the cleaned text and how many were removed. */
export function sanitizeText(text: string): { text: string; removed: number } {
  let removed = 0;
  const paragraphs = text.split(/\n{2,}/).map((paragraph) => {
    const kept = splitSentences(paragraph).filter((sentence) => {
      if (!sentence.trim()) return false;
      if (isUnsafeSentence(sentence)) {
        removed++;
        return false;
      }
      return true;
    });
    return kept.join("").replace(/\s+/g, " ").trim();
  });
  return { text: paragraphs.filter(Boolean).join("\n\n"), removed };
}

/**
 * Apply `sanitizeText` across a whole interpretation. Items whose required
 * text becomes empty are dropped entirely.
 */
export function sanitizeInterpretation(input: PalmInterpretation): {
  interpretation: PalmInterpretation;
  removed: number;
} {
  let removed = 0;
  const clean = (text: string) => {
    const result = sanitizeText(text);
    removed += result.removed;
    return result.text;
  };

  const headline = clean(input.overview.headline) || "Your palm, through the lens of tradition";
  const summary =
    clean(input.overview.summary) ||
    "Here is how traditional palmistry reads the features we could see — for reflection, not prediction.";

  const sections = input.sections.flatMap((section) => {
    const s = clean(section.summary);
    if (!s) return [];
    const details = clean(section.details) || s;
    const points = section.points.map(clean).filter(Boolean);
    return [{ ...section, summary: s, details, points }];
  });
  const lines = input.lines.flatMap((line) => {
    const s = clean(line.summary);
    return s ? [{ ...line, summary: s, details: clean(line.details) || s }] : [];
  });
  const mounts = input.mounts.flatMap((mount) => {
    const s = clean(mount.summary);
    return s ? [{ ...mount, summary: s, details: clean(mount.details) || s }] : [];
  });
  const narrative = (n: PalmInterpretation["fingers"]) => {
    if (!n) return null;
    const s = clean(n.summary);
    return s ? { ...n, summary: s, details: clean(n.details) || s } : null;
  };

  const passage = <P extends { text: string }>(p: P | null): P | null => {
    if (!p) return null;
    const text = clean(p.text);
    return text ? { ...p, text } : null;
  };
  const n = input.narrative;
  const story = n
    ? {
        headline: clean(n.headline) || headline,
        introduction:
          clean(n.introduction) ||
          "Here is how traditional palmistry reads the features we could see — for reflection, not prediction.",
        thinking: passage(n.thinking),
        caring: passage(n.caring),
        strengths: n.strengths.flatMap((s) => {
          const kept = passage(s);
          return kept ? [kept] : [];
        }),
        career: passage(n.career),
        insight: passage(n.insight),
      }
    : undefined;

  return {
    interpretation: {
      ...(story ? { narrative: story } : {}),
      overview: { headline, summary },
      sections,
      lines,
      mounts,
      fingers: narrative(input.fingers),
      markings: narrative(input.markings),
    },
    removed,
  };
}
