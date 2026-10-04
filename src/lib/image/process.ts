import "server-only";
import sharp, { type OutputInfo } from "sharp";
import { AppError } from "@/lib/http/errors";
import {
  UPLOAD_LIMITS,
  assessQuality,
  computeGrayscaleMetrics,
  hasBlockingIssue,
  heuristicScore,
  type QualityIssue,
  type QualityMetrics,
} from "./quality";

export type SniffedType = "image/jpeg" | "image/png" | "image/webp";

/** Identify the real file type from its magic bytes; the client's MIME type is not trusted. */
export function sniffImageType(buffer: Buffer): SniffedType | null {
  if (buffer.length < 12) return null;
  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return "image/jpeg";
  if (buffer.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))) {
    return "image/png";
  }
  if (buffer.toString("ascii", 0, 4) === "RIFF" && buffer.toString("ascii", 8, 12) === "WEBP") {
    return "image/webp";
  }
  return null;
}

export interface ProcessedImage {
  /** Re-encoded JPEG, max 1600px, all metadata (EXIF/GPS) stripped. */
  image: Buffer;
  thumbnail: Buffer;
  width: number;
  height: number;
  metrics: QualityMetrics;
  issues: QualityIssue[];
  qualityScore: number;
}

const MAX_INPUT_PIXELS = 40_000_000;

export async function processPalmImage(input: Buffer): Promise<ProcessedImage> {
  if (!sniffImageType(input)) {
    throw new AppError("IMAGE_INVALID", {
      message: "Please upload a JPG, JPEG, PNG or WebP image.",
    });
  }

  let normalized: { data: Buffer; info: OutputInfo };
  try {
    // rotate() applies EXIF orientation; encoding without withMetadata() drops EXIF/GPS.
    normalized = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS, failOn: "error" })
      .rotate()
      .resize({
        width: UPLOAD_LIMITS.uploadLongEdge,
        height: UPLOAD_LIMITS.uploadLongEdge,
        fit: "inside",
        withoutEnlargement: true,
      })
      .flatten({ background: "#000000" })
      .jpeg({ quality: 86, mozjpeg: true })
      .toBuffer({ resolveWithObject: true });
  } catch (error) {
    throw new AppError("IMAGE_INVALID", {
      message: "We couldn't read that image. Please try a different photo.",
      internal: error,
    });
  }

  const original = await sharp(input, { limitInputPixels: MAX_INPUT_PIXELS }).metadata();
  const rotated = (original.orientation ?? 1) >= 5;
  const width = (rotated ? original.height : original.width) ?? normalized.info.width;
  const height = (rotated ? original.width : original.height) ?? normalized.info.height;

  const gray = await sharp(normalized.data)
    .resize({
      width: UPLOAD_LIMITS.analysisLongEdge,
      height: UPLOAD_LIMITS.analysisLongEdge,
      fit: "inside",
    })
    .toColourspace("b-w")
    .raw()
    .toBuffer({ resolveWithObject: true });
  const channels = gray.info.channels;
  const luma =
    channels === 1 ? gray.data : Buffer.from(gray.data.filter((_, i) => i % channels === 0));
  const metrics = computeGrayscaleMetrics(luma, gray.info.width, gray.info.height);
  const issues = assessQuality({ metrics, width, height });

  if (hasBlockingIssue(issues)) {
    throw new AppError("IMAGE_QUALITY", {
      message: issues.find((i) => i.severity === "block")!.message,
      details: { issues: issues.map((i) => i.code) },
    });
  }

  const thumbnail = await sharp(normalized.data)
    .resize({ width: 480, height: 360, fit: "cover", position: "centre" })
    .jpeg({ quality: 72, mozjpeg: true })
    .toBuffer();

  return {
    image: normalized.data,
    thumbnail,
    width,
    height,
    metrics,
    issues,
    qualityScore: heuristicScore(metrics),
  };
}
