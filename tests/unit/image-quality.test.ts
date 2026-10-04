import sharp from "sharp";
import { describe, expect, it } from "vitest";
import { sniffImageType } from "@/lib/image/process";
import {
  assessQuality,
  computeGrayscaleMetrics,
  estimateCentralSkinFraction,
  hasBlockingIssue,
  rgbaToGray,
} from "@/lib/image/quality";
import { palmLikeImage } from "../helpers/images";

async function metricsOf(buffer: Buffer) {
  const g = await sharp(buffer)
    .resize(512, 512, { fit: "inside" })
    .toColourspace("b-w")
    .raw()
    .toBuffer({ resolveWithObject: true });
  return { metrics: computeGrayscaleMetrics(g.data, g.info.width, g.info.height), ...g.info };
}

describe("image quality heuristics", () => {
  it("passes a bright, sharp palm photo", async () => {
    const { metrics } = await metricsOf(await palmLikeImage());
    expect(assessQuality({ metrics, width: 1200, height: 1600 })).toEqual([]);
  });

  it("blocks extremely dark photos", async () => {
    const { metrics } = await metricsOf(await palmLikeImage({ brightness: 0.2 }));
    const issues = assessQuality({ metrics, width: 1200, height: 1600 });
    expect(issues.map((i) => i.code)).toContain("too_dark");
    expect(hasBlockingIssue(issues)).toBe(true);
  });

  it("blocks extremely blurry photos but only warns for slightly soft ones", async () => {
    const blurry = await metricsOf(await palmLikeImage({ blur: 14 }));
    expect(
      assessQuality({ metrics: blurry.metrics, width: 1200, height: 1600 }).map((i) => i.code),
    ).toContain("blurry");
    const soft = await metricsOf(await palmLikeImage({ blur: 4 }));
    const softIssues = assessQuality({ metrics: soft.metrics, width: 1200, height: 1600 });
    expect(hasBlockingIssue(softIssues)).toBe(false);
  });

  it("blocks images that are too small", () => {
    const metrics = { brightness: 120, contrast: 50, sharpness: 100, clippedFraction: 0 };
    expect(assessQuality({ metrics, width: 400, height: 300 })[0].code).toBe("low_resolution");
  });

  it("only warns (never blocks) when a palm can't be detected heuristically", () => {
    const metrics = { brightness: 120, contrast: 50, sharpness: 100, clippedFraction: 0 };
    const issues = assessQuality({ metrics, width: 1200, height: 1600, skinFraction: 0.01 });
    expect(issues).toEqual([expect.objectContaining({ code: "palm_uncertain", severity: "warn" })]);
  });

  it("estimates skin coverage from RGBA pixels", async () => {
    const raw = await sharp(await palmLikeImage())
      .resize(300, 400)
      .ensureAlpha()
      .raw()
      .toBuffer();
    expect(estimateCentralSkinFraction(raw, 300, 400)).toBeGreaterThan(0.3);
    const gray = rgbaToGray(raw);
    expect(gray.length).toBe(300 * 400);
  });

  it("identifies real image types by magic bytes", async () => {
    expect(sniffImageType(await palmLikeImage({ format: "png", width: 600, height: 800 }))).toBe(
      "image/png",
    );
    expect(sniffImageType(await palmLikeImage({ format: "webp", width: 600, height: 800 }))).toBe(
      "image/webp",
    );
    expect(sniffImageType(await palmLikeImage({ width: 600, height: 800 }))).toBe("image/jpeg");
    expect(
      sniffImageType(Buffer.from("<svg xmlns='http://www.w3.org/2000/svg'></svg>")),
    ).toBeNull();
    expect(sniffImageType(Buffer.from("GIF89a....."))).toBeNull();
  });
});
