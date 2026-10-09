import { msg } from "@/lib/i18n/msg";
import {
  INSUFFICIENT,
  LINE_NAMES,
  MOUNT_NAMES,
  isObservedLine,
  type LineName,
  type MountName,
  type PalmAnalysis,
} from "@/lib/schemas/palm-analysis";

/**
 * Canonical identifiers for observable features. Interpretations must cite
 * these in `basedOn`, which lets us mechanically verify that every statement is
 * grounded in something the vision stage actually reported.
 */
export type FeatureKey =
  | "palmShape"
  | "fingers"
  | "fingers.thumb"
  | `lines.${LineName}`
  | `mounts.${MountName}`
  | `markings.${number}`;

export const FEATURE_KEY_PATTERN =
  /^(palmShape|fingers|fingers\.thumb|lines\.(life|head|heart|fate)|mounts\.(venus|jupiter|saturn|apollo|mercury|mars|moon)|markings\.\d{1,2})$/;

/** Below this confidence a feature is treated as not reliably observed. */
export const MIN_FEATURE_CONFIDENCE = 0.35;

const LINE_LABELS: Record<LineName, string> = {
  life: msg("Life line"),
  head: msg("Head line"),
  heart: msg("Heart line"),
  fate: msg("Fate line"),
};

const MOUNT_LABELS: Record<MountName, string> = {
  venus: msg("Mount of Venus"),
  jupiter: msg("Mount of Jupiter"),
  saturn: msg("Mount of Saturn"),
  apollo: msg("Mount of Apollo (Sun)"),
  mercury: msg("Mount of Mercury"),
  mars: msg("Mount of Mars"),
  moon: msg("Mount of Moon"),
};

export function lineLabel(line: LineName): string {
  return LINE_LABELS[line];
}

export function mountLabel(mount: MountName): string {
  return MOUNT_LABELS[mount];
}

export function featureLabel(key: string, analysis?: PalmAnalysis): string {
  if (key === "palmShape") return msg("Palm shape");
  if (key === "fingers") return msg("Finger proportions");
  if (key === "fingers.thumb") return msg("Thumb");
  const [group, name] = key.split(".");
  if (group === "lines" && (LINE_NAMES as readonly string[]).includes(name)) {
    return LINE_LABELS[name as LineName];
  }
  if (group === "mounts" && (MOUNT_NAMES as readonly string[]).includes(name)) {
    return MOUNT_LABELS[name as MountName];
  }
  if (group === "markings") {
    const marking = analysis?.markings[Number(name)];
    return marking ? `${capitalize(marking.type)} marking (${marking.location})` : "Palm marking";
  }
  return key;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

/**
 * Every feature the analysis reports with enough confidence, mapped to that
 * confidence. Anything not in this map must not be interpreted.
 */
export function availableFeatures(
  analysis: PalmAnalysis,
  minConfidence = MIN_FEATURE_CONFIDENCE,
): Map<FeatureKey, number> {
  const features = new Map<FeatureKey, number>();

  if (analysis.palmShape !== INSUFFICIENT && analysis.palmShape.confidence >= minConfidence) {
    features.set("palmShape", analysis.palmShape.confidence);
  }
  if (analysis.fingers !== INSUFFICIENT && analysis.fingers.confidence >= minConfidence) {
    features.set("fingers", analysis.fingers.confidence);
    const thumb = analysis.fingers.thumb;
    if (thumb !== INSUFFICIENT && thumb.confidence >= minConfidence) {
      features.set("fingers.thumb", thumb.confidence);
    }
  }
  for (const name of LINE_NAMES) {
    const line = analysis.lines[name];
    if (isObservedLine(line) && line.confidence >= minConfidence) {
      features.set(`lines.${name}`, line.confidence);
    }
  }
  for (const name of MOUNT_NAMES) {
    const mount = analysis.mounts[name];
    if (mount !== INSUFFICIENT && mount.confidence >= minConfidence) {
      features.set(`mounts.${name}`, mount.confidence);
    }
  }
  analysis.markings.forEach((marking, index) => {
    if (marking.confidence >= minConfidence) features.set(`markings.${index}`, marking.confidence);
  });

  return features;
}
