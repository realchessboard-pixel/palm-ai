import type { PalmInterpretation, ReadingNarrative } from "@/lib/schemas/palm-interpretation";

/**
 * Every human-readable string in an interpretation, keyed by a STABLE id
 * (section/line/mount names, not array positions). Stable ids let a
 * translation be cached per text, topped up when more content becomes visible
 * (e.g. after unlocking the detailed reading), and invalidated when the
 * English source changes.
 */
interface TextTree {
  overview: { headline: string; summary: string };
  narrative?: ReadingNarrative | null;
  sections: {
    id: string;
    title: string;
    summary: string;
    details: string | null;
    points: string[];
  }[];
  lines: { line: string; summary: string; details: string | null }[];
  mounts: { mount: string; summary: string; details: string | null }[];
  fingers: { summary: string; details: string } | null;
  markings: { summary: string; details: string } | null;
}

export function collectTexts(tree: TextTree): Map<string, string> {
  const out = new Map<string, string>();
  const put = (id: string, text: string | null | undefined) => {
    if (text && text.trim()) out.set(id, text);
  };

  put("overview.headline", tree.overview.headline);
  put("overview.summary", tree.overview.summary);

  const n = tree.narrative;
  if (n) {
    put("narrative.headline", n.headline);
    put("narrative.introduction", n.introduction);
    put("narrative.thinking", n.thinking?.text);
    put("narrative.caring", n.caring?.text);
    put("narrative.career", n.career?.text);
    n.strengths.forEach((s, i) => {
      put(`narrative.strengths.${i}.name`, s.name);
      put(`narrative.strengths.${i}.text`, s.text);
    });
    put("narrative.insight.title", n.insight?.title);
    put("narrative.insight.text", n.insight?.text);
  }

  for (const s of tree.sections) {
    put(`sections.${s.id}.title`, s.title);
    put(`sections.${s.id}.summary`, s.summary);
    put(`sections.${s.id}.details`, s.details);
    s.points.forEach((p, i) => put(`sections.${s.id}.points.${i}`, p));
  }
  for (const l of tree.lines) {
    put(`lines.${l.line}.summary`, l.summary);
    put(`lines.${l.line}.details`, l.details);
  }
  for (const m of tree.mounts) {
    put(`mounts.${m.mount}.summary`, m.summary);
    put(`mounts.${m.mount}.details`, m.details);
  }
  put("fingers.summary", tree.fingers?.summary);
  put("fingers.details", tree.fingers?.details);
  put("markings.summary", tree.markings?.summary);
  put("markings.details", tree.markings?.details);
  return out;
}

/** Replace texts by id. Ids without a translation keep the English text. */
export function applyTexts(
  interpretation: PalmInterpretation,
  texts: ReadonlyMap<string, string>,
): PalmInterpretation {
  const t = (id: string, fallback: string) => texts.get(id) ?? fallback;
  const n = interpretation.narrative;

  return {
    ...interpretation,
    overview: {
      headline: t("overview.headline", interpretation.overview.headline),
      summary: t("overview.summary", interpretation.overview.summary),
    },
    ...(n
      ? {
          narrative: {
            headline: t("narrative.headline", n.headline),
            introduction: t("narrative.introduction", n.introduction),
            thinking: n.thinking && {
              ...n.thinking,
              text: t("narrative.thinking", n.thinking.text),
            },
            caring: n.caring && { ...n.caring, text: t("narrative.caring", n.caring.text) },
            career: n.career && { ...n.career, text: t("narrative.career", n.career.text) },
            strengths: n.strengths.map((s, i) => ({
              ...s,
              name: t(`narrative.strengths.${i}.name`, s.name),
              text: t(`narrative.strengths.${i}.text`, s.text),
            })),
            insight: n.insight && {
              ...n.insight,
              title: t("narrative.insight.title", n.insight.title),
              text: t("narrative.insight.text", n.insight.text),
            },
          },
        }
      : {}),
    sections: interpretation.sections.map((s) => ({
      ...s,
      title: t(`sections.${s.id}.title`, s.title),
      summary: t(`sections.${s.id}.summary`, s.summary),
      details: t(`sections.${s.id}.details`, s.details),
      points: s.points.map((p, i) => t(`sections.${s.id}.points.${i}`, p)),
    })),
    lines: interpretation.lines.map((l) => ({
      ...l,
      summary: t(`lines.${l.line}.summary`, l.summary),
      details: t(`lines.${l.line}.details`, l.details),
    })),
    mounts: interpretation.mounts.map((m) => ({
      ...m,
      summary: t(`mounts.${m.mount}.summary`, m.summary),
      details: t(`mounts.${m.mount}.details`, m.details),
    })),
    fingers: interpretation.fingers && {
      ...interpretation.fingers,
      summary: t("fingers.summary", interpretation.fingers.summary),
      details: t("fingers.details", interpretation.fingers.details),
    },
    markings: interpretation.markings && {
      ...interpretation.markings,
      summary: t("markings.summary", interpretation.markings.summary),
      details: t("markings.details", interpretation.markings.details),
    },
  };
}
