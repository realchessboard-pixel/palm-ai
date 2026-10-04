import type { LineName } from "@/lib/schemas/palm-analysis";
import {
  SECTION_IDS,
  type LineReading,
  type MountReading,
  type PalmInterpretation,
  type ReadingSection,
  type SectionId,
} from "@/lib/schemas/palm-interpretation";

/**
 * Entitlement projection: decides which parts of a stored interpretation are
 * sent to the client. Premium content is never sent to a non-entitled viewer —
 * it is removed here on the server, not hidden with CSS.
 */
export const FREE_SECTIONS: readonly SectionId[] = ["personality", "career"];
export const FREE_LINES: readonly LineName[] = ["heart", "head", "life"];

export type ProjectedSection = Omit<ReadingSection, "details"> & { details: string | null };
export type ProjectedLine = Omit<LineReading, "details"> & { details: string | null };

export interface ProjectedInterpretation {
  overview: PalmInterpretation["overview"];
  sections: ProjectedSection[];
  lines: ProjectedLine[];
  mounts: MountReading[];
  fingers: PalmInterpretation["fingers"];
  markings: PalmInterpretation["markings"];
}

export interface LockedContent {
  sections: SectionId[];
  lines: LineName[];
  mountCount: number;
  fingers: boolean;
  markings: boolean;
  detailedSections: SectionId[];
}

export function projectInterpretation(
  interpretation: PalmInterpretation,
  premium: boolean,
): { interpretation: ProjectedInterpretation; locked: LockedContent | null } {
  if (premium) {
    return { interpretation: { ...interpretation }, locked: null };
  }

  const freeSections = interpretation.sections
    .filter((s) => FREE_SECTIONS.includes(s.id))
    .map((s) => ({ ...s, details: null, points: [] }));
  const freeLines = interpretation.lines
    .filter((l) => FREE_LINES.includes(l.line))
    .map((l) => ({ ...l, details: null }));

  const lockedSections = interpretation.sections
    .filter((s) => !FREE_SECTIONS.includes(s.id))
    .map((s) => s.id)
    .sort((a, b) => SECTION_IDS.indexOf(a) - SECTION_IDS.indexOf(b));
  const lockedLines = interpretation.lines
    .filter((l) => !FREE_LINES.includes(l.line))
    .map((l) => l.line);

  return {
    interpretation: {
      overview: interpretation.overview,
      sections: freeSections,
      lines: freeLines,
      mounts: [],
      fingers: null,
      markings: null,
    },
    locked: {
      sections: lockedSections,
      lines: lockedLines,
      mountCount: interpretation.mounts.length,
      fingers: interpretation.fingers !== null,
      markings: interpretation.markings !== null,
      detailedSections: freeSections.map((s) => s.id),
    },
  };
}
