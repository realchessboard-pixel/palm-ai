import type { ReadingNarrative, SectionId } from "@/lib/schemas/palm-interpretation";
import type { ProjectedInterpretation, ProjectedSection } from "./projection";

/**
 * The main reading to display. Readings written since schema v2 carry their
 * own narrative; older readings are presented in the same shape from their
 * sections, so every reading uses one layout. `usedSections` lists sections
 * already shown in the main reading (so the detailed part doesn't repeat them).
 */
export function narrativeFor(interpretation: ProjectedInterpretation): {
  narrative: ReadingNarrative;
  usedSections: SectionId[];
} {
  if (interpretation.narrative) return { narrative: interpretation.narrative, usedSections: [] };

  const used: SectionId[] = [];
  const section = (id: SectionId) => {
    const found = interpretation.sections.find((s) => s.id === id);
    if (found) used.push(id);
    return found;
  };
  const passage = (s: ProjectedSection | undefined) =>
    s ? { text: [s.summary, s.details].filter(Boolean).join("\n\n"), basedOn: s.basedOn } : null;

  const heart = interpretation.lines.find((l) => l.line === "heart");
  const strengths = section("strengths");
  const highlights = section("highlights");

  return {
    narrative: {
      headline: interpretation.overview.headline,
      introduction: interpretation.overview.summary,
      thinking: passage(section("personality")),
      caring:
        passage(section("relationships")) ??
        (heart
          ? {
              text: [heart.summary, heart.details].filter(Boolean).join("\n\n"),
              basedOn: heart.basedOn,
            }
          : null),
      strengths: (strengths?.points ?? []).slice(0, 6).map((point) => ({
        name: point.split(" — ")[0]!.slice(0, 40),
        text: point,
        basedOn: strengths!.basedOn,
      })),
      career: passage(section("career")),
      insight: highlights
        ? {
            title: highlights.title,
            text: [highlights.summary, highlights.details].filter(Boolean).join("\n\n"),
            basedOn: highlights.basedOn,
          }
        : null,
    },
    usedSections: used,
  };
}
