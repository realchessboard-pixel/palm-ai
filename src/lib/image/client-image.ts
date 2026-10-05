"use client";

import {
  ACCEPTED_IMAGE_TYPES,
  UPLOAD_LIMITS,
  assessQuality,
  computeGrayscaleMetrics,
  estimateCentralSkinFraction,
  rgbaToGray,
  type QualityIssue,
  type QualityMetrics,
} from "./quality";

export interface PreparedImage {
  /** Downscaled JPEG that is actually uploaded (EXIF stripped by re-encoding). */
  blob: Blob;
  previewUrl: string;
  width: number;
  height: number;
  metrics: QualityMetrics;
  issues: QualityIssue[];
}

export class ImageInputError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ImageInputError";
  }
}

export function validateFileBasics(file: File | null | undefined): void {
  if (!file) throw new ImageInputError("Please choose a photo of your palm.");
  if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
    throw new ImageInputError("Please upload a JPG, JPEG, PNG or WebP image.");
  }
  if (file.size === 0) throw new ImageInputError("That file appears to be empty.");
  if (file.size > UPLOAD_LIMITS.maxOriginalBytes) {
    throw new ImageInputError("That image is larger than 15 MB. Please choose a smaller photo.");
  }
}

async function decode(source: Blob): Promise<ImageBitmap | HTMLImageElement> {
  if ("createImageBitmap" in window) {
    try {
      return await createImageBitmap(source, { imageOrientation: "from-image" });
    } catch {
      // Fall through to the <img> decoder (older Safari).
    }
  }
  const url = URL.createObjectURL(source);
  try {
    const img = new Image();
    img.decoding = "async";
    img.src = url;
    await img.decode();
    return img;
  } catch {
    throw new ImageInputError("We couldn't read that image. Please try a different photo.");
  } finally {
    URL.revokeObjectURL(url);
  }
}

function dimensions(image: ImageBitmap | HTMLImageElement) {
  return "naturalWidth" in image
    ? { width: image.naturalWidth, height: image.naturalHeight }
    : { width: image.width, height: image.height };
}

function drawScaled(image: CanvasImageSource, width: number, height: number, longEdge: number) {
  const scale = Math.min(1, longEdge / Math.max(width, height));
  const w = Math.max(1, Math.round(width * scale));
  const h = Math.max(1, Math.round(height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) throw new ImageInputError("Your browser couldn't process this image.");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(image, 0, 0, w, h);
  return { canvas, ctx, w, h };
}

function toBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new ImageInputError("Couldn't prepare the photo."))),
      "image/jpeg",
      0.9,
    ),
  );
}

/** Decode, quality-check and downscale an image entirely in the browser. */
export async function prepareImage(source: Blob): Promise<PreparedImage> {
  const image = await decode(source);
  const { width, height } = dimensions(image);
  if (!width || !height) throw new ImageInputError("We couldn't read that image.");

  const analysis = drawScaled(image, width, height, UPLOAD_LIMITS.analysisLongEdge);
  const pixels = analysis.ctx.getImageData(0, 0, analysis.w, analysis.h).data;
  const metrics = computeGrayscaleMetrics(rgbaToGray(pixels), analysis.w, analysis.h);
  const skinFraction = estimateCentralSkinFraction(pixels, analysis.w, analysis.h);
  const issues = assessQuality({ metrics, width, height, skinFraction });

  const upload = drawScaled(image, width, height, UPLOAD_LIMITS.uploadLongEdge);
  const blob = await toBlob(upload.canvas);
  if ("close" in image) image.close();

  return {
    blob,
    previewUrl: URL.createObjectURL(blob),
    width,
    height,
    metrics,
    issues,
  };
}

/** Grab the current frame from a <video> element as a JPEG blob. */
export async function captureVideoFrame(video: HTMLVideoElement): Promise<Blob> {
  const { canvas } = drawScaled(video, video.videoWidth, video.videoHeight, 2400);
  return toBlob(canvas);
}
