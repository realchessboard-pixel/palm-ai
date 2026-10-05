/**
 * Image quality heuristics shared by the browser (canvas) and the server
 * (sharp). Pure functions over pixel buffers, so they're easy to unit test.
 *
 * These are deliberately conservative: they only BLOCK images that are
 * extremely dark, overexposed or blurry. Palm presence is only estimated here
 * (as a soft warning); the vision model makes the real call and reports its
 * own confidence.
 */

export const ACCEPTED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export type AcceptedImageType = (typeof ACCEPTED_IMAGE_TYPES)[number];

export const UPLOAD_LIMITS = {
  /** Largest original file we accept in the browser before compressing it. */
  maxOriginalBytes: 15 * 1024 * 1024,
  /** Shortest image edge, in pixels, that still shows palm lines usefully. */
  minShortEdge: 480,
  /** Long edge the browser downsizes to before upload (also the server cap). */
  uploadLongEdge: 1600,
  /** Long edge used for quality analysis (both client and server). */
  analysisLongEdge: 512,
} as const;

export const QUALITY_THRESHOLDS = {
  tooDarkMean: 45,
  overexposedMean: 238,
  overexposedClippedFraction: 0.55,
  lowContrastStd: 14,
  /** Laplacian variance at 512px. Below `blurBlock` the image is extremely blurry. */
  blurBlock: 6,
  blurWarn: 18,
  /** Fraction of centre pixels that look skin-toned. Heuristic only. */
  palmWarnSkinFraction: 0.12,
} as const;

export interface QualityMetrics {
  /** Mean luma, 0–255. */
  brightness: number;
  /** Standard deviation of luma. */
  contrast: number;
  /** Variance of the Laplacian; higher = sharper. */
  sharpness: number;
  /** Fraction of pixels that are almost pure white. */
  clippedFraction: number;
}

export type QualityIssueCode =
  | "too_dark"
  | "overexposed"
  | "blurry"
  | "slightly_blurry"
  | "low_contrast"
  | "low_resolution"
  | "palm_uncertain";

export interface QualityIssue {
  code: QualityIssueCode;
  severity: "block" | "warn";
  message: string;
}

export const QUALITY_MESSAGES: Record<QualityIssueCode, string> = {
  too_dark: "Your palm is too dark. Try taking the photo in brighter light.",
  overexposed: "Your photo is too bright. Move away from direct light or turn off the flash.",
  blurry: "Your image appears blurry. Hold your hand steady and try again.",
  slightly_blurry:
    "Your photo looks a little soft. A sharper photo will give a more detailed reading.",
  low_contrast: "The lines are hard to see. Try brighter, more even lighting.",
  low_resolution: "This image is too small. Please use a larger, closer photo of your palm.",
  palm_uncertain:
    "We couldn't clearly find a palm. Please place your entire palm inside the frame.",
};

export function issue(code: QualityIssueCode, severity: QualityIssue["severity"]): QualityIssue {
  return { code, severity, message: QUALITY_MESSAGES[code] };
}

/** Convert RGBA pixels (e.g. canvas ImageData) to 8-bit luma. */
export function rgbaToGray(rgba: Uint8ClampedArray | Uint8Array): Uint8Array {
  const gray = new Uint8Array(rgba.length / 4);
  for (let i = 0, p = 0; i < rgba.length; i += 4, p++) {
    gray[p] = Math.round(0.299 * rgba[i] + 0.587 * rgba[i + 1] + 0.114 * rgba[i + 2]);
  }
  return gray;
}

export function computeGrayscaleMetrics(
  gray: Uint8Array | Uint8ClampedArray,
  width: number,
  height: number,
): QualityMetrics {
  const n = width * height;
  if (n === 0 || gray.length < n) throw new Error("Invalid grayscale buffer");

  let sum = 0;
  let sumSq = 0;
  let clipped = 0;
  for (let i = 0; i < n; i++) {
    const v = gray[i];
    sum += v;
    sumSq += v * v;
    if (v >= 250) clipped++;
  }
  const mean = sum / n;
  const variance = Math.max(0, sumSq / n - mean * mean);

  // 4-neighbour Laplacian over interior pixels.
  let lapSum = 0;
  let lapSumSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y++) {
    const row = y * width;
    for (let x = 1; x < width - 1; x++) {
      const i = row + x;
      const lap = gray[i - width] + gray[i + width] + gray[i - 1] + gray[i + 1] - 4 * gray[i];
      lapSum += lap;
      lapSumSq += lap * lap;
      count++;
    }
  }
  const lapMean = count ? lapSum / count : 0;
  const sharpness = count ? Math.max(0, lapSumSq / count - lapMean * lapMean) : 0;

  return {
    brightness: mean,
    contrast: Math.sqrt(variance),
    sharpness,
    clippedFraction: clipped / n,
  };
}

/**
 * Rough skin-tone coverage of the central region using a broad YCbCr range.
 * Lighting and skin tone vary widely, so this is ONLY used for a soft warning.
 */
export function estimateCentralSkinFraction(
  rgba: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): number {
  const x0 = Math.floor(width * 0.2);
  const x1 = Math.ceil(width * 0.8);
  const y0 = Math.floor(height * 0.2);
  const y1 = Math.ceil(height * 0.8);
  let skin = 0;
  let total = 0;
  for (let y = y0; y < y1; y += 2) {
    for (let x = x0; x < x1; x += 2) {
      const i = (y * width + x) * 4;
      const r = rgba[i];
      const g = rgba[i + 1];
      const b = rgba[i + 2];
      const cb = 128 - 0.168736 * r - 0.331264 * g + 0.5 * b;
      const cr = 128 + 0.5 * r - 0.418688 * g - 0.081312 * b;
      if (cb >= 72 && cb <= 135 && cr >= 128 && cr <= 180) skin++;
      total++;
    }
  }
  return total ? skin / total : 0;
}

export interface AssessInput {
  metrics: QualityMetrics;
  width: number;
  height: number;
  /** Optional skin-coverage estimate; omitted server-side. */
  skinFraction?: number;
}

export function assessQuality({
  metrics,
  width,
  height,
  skinFraction,
}: AssessInput): QualityIssue[] {
  const issues: QualityIssue[] = [];
  const t = QUALITY_THRESHOLDS;

  if (Math.min(width, height) < UPLOAD_LIMITS.minShortEdge)
    issues.push(issue("low_resolution", "block"));
  if (metrics.brightness < t.tooDarkMean) issues.push(issue("too_dark", "block"));
  else if (
    metrics.brightness > t.overexposedMean ||
    metrics.clippedFraction > t.overexposedClippedFraction
  ) {
    issues.push(issue("overexposed", "block"));
  }
  if (metrics.sharpness < t.blurBlock) issues.push(issue("blurry", "block"));
  else if (metrics.sharpness < t.blurWarn) issues.push(issue("slightly_blurry", "warn"));
  if (metrics.contrast < t.lowContrastStd && !issues.some((i) => i.severity === "block")) {
    issues.push(issue("low_contrast", "warn"));
  }
  if (skinFraction !== undefined && skinFraction < t.palmWarnSkinFraction) {
    issues.push(issue("palm_uncertain", "warn"));
  }
  return issues;
}

/** 0–1 score summarising the heuristics, for display only. */
export function heuristicScore(metrics: QualityMetrics): number {
  const brightness = 1 - Math.min(1, Math.abs(metrics.brightness - 140) / 140);
  const sharp = Math.min(1, metrics.sharpness / 60);
  const contrast = Math.min(1, metrics.contrast / 50);
  return Math.round((0.35 * brightness + 0.45 * sharp + 0.2 * contrast) * 100) / 100;
}

export function hasBlockingIssue(issues: QualityIssue[]): boolean {
  return issues.some((i) => i.severity === "block");
}
