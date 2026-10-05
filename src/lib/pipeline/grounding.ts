import { availableFeatures, type FeatureKey } from "@/lib/palmistry/features";
import { LINE_NAMES, MOUNT_NAMES, type PalmAnalysis } from "@/lib/schemas/palm-analysis";
import type { PalmInterpretation } from "@/lib/schemas/palm-interpretation";

/**
 * Grounding filter: enforces that the interpretation only talks about
 * features stage 1 actually observed.
 *  - citations (`basedOn`) to unavailable features are removed;
 *  - items left with no valid citation are removed;
 *  - sentences that mention an unobserved line or mount by name are removed.
 */
export interface GroundingResult {
  interpretation: PalmInterpretation;
  removed: number;
  invalidCitations: number;
}

function mentionPatterns(available: Map<FeatureKey, number>): RegExp[] {
  const patterns: RegExp[] = [];
  for (const line of LINE_NAMES) {
    if (!available.has(`lines.${line}`)) patterns.push(new RegExp(`\\b${line}[- ]?lines?\\b`, "i"));
  }
  for (const mount of MOUNT_NAMES) {
    if (!available.has(`mounts.${mount}`)) {
      patterns.push(new RegExp(`\\b(mounts? of ${mount}|${mount} mount)\\b`, "i"));
    }
  }
  return patterns;
}

export function groundInterpretation(
  input: PalmInterpretation,
  analysis: PalmAnalysis,
): GroundingResult {
  const available = availableFeatures(analysis);
  const patterns = mentionPatterns(available);
  let removed = 0;
  let invalidCitations = 0;

  const cite = (keys: string[]) => {
    const valid = keys.filter((k) => available.has(k as FeatureKey));
    invalidCitations += keys.length - valid.length;
    return [...new Set(valid)];
  };

  const scrub = (text: string) => {
    if (!patterns.length) return text;
    const sentences = text.match(/[^.!?\n]+(?:[.!?]+["')\]]*|\n+|$)/g) ?? [text];
    const kept = sentences.filter((s) => {
      const bad = patterns.some((re) => re.test(s));
      if (bad) removed++;
      return !bad;
    });
    return kept
      .join("")
      .replace(/[ \t]+/g, " ")
      .trim();
  };

  const sections = input.sections.flatMap((section) => {
    const basedOn = cite(section.basedOn);
    const summary = scrub(section.summary);
    if (basedOn.length === 0 || !summary) {
      removed++;
      return [];
    }
    return [
      {
        ...section,
        basedOn,
        summary,
        details: scrub(section.details) || summary,
        points: section.points.map(scrub).filter(Boolean),
      },
    ];
  });

  const lines = input.lines.flatMap((line) => {
    const key = `lines.${line.line}` as FeatureKey;
    if (!available.has(key)) {
      removed++;
      invalidCitations++;
      return [];
    }
    const basedOn = cite(line.basedOn);
    const summary = scrub(line.summary);
    if (!summary) {
      removed++;
      return [];
    }
    return [
      {
        ...line,
        basedOn: basedOn.length ? basedOn : [key],
        summary,
        details: scrub(line.details) || summary,
      },
    ];
  });

  const mounts = input.mounts.flatMap((mount) => {
    const key = `mounts.${mount.mount}` as FeatureKey;
    if (!available.has(key)) {
      removed++;
      invalidCitations++;
      return [];
    }
    const basedOn = cite(mount.basedOn);
    return [{ ...mount, basedOn: basedOn.length ? basedOn : [key] }];
  });

  const hasFingers = available.has("fingers") || available.has("fingers.thumb");
  const hasMarkings = [...available.keys()].some((k) => k.startsWith("markings."));
  let fingers = input.fingers;
  if (fingers) {
    const basedOn = cite(fingers.basedOn);
    if (!hasFingers || basedOn.length === 0) {
      removed++;
      fingers = null;
    } else {
      fingers = { ...fingers, basedOn };
    }
  }
  let markings = input.markings;
  if (markings) {
    const basedOn = cite(markings.basedOn);
    if (!hasMarkings || basedOn.length === 0) {
      removed++;
      markings = null;
    } else {
      markings = { ...markings, basedOn };
    }
  }

  return {
    interpretation: {
      overview: {
        headline: input.overview.headline,
        summary:
          scrub(input.overview.summary) ||
          "Here is how traditional palmistry reads the features we could see — for reflection, not prediction.",
      },
      sections,
      lines,
      mounts,
      fingers,
      markings,
    },
    removed,
    invalidCitations,
  };
}
