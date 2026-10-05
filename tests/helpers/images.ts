import sharp from "sharp";

/**
 * Synthetic "palm-like" test images: skin-toned hand silhouette with darker
 * creases and fine texture. Not a real hand — just realistic enough for the
 * brightness / blur heuristics.
 */
export async function palmLikeImage(
  options: {
    width?: number;
    height?: number;
    brightness?: number;
    blur?: number;
    format?: "jpeg" | "png" | "webp";
  } = {},
): Promise<Buffer> {
  const width = options.width ?? 1200;
  const height = options.height ?? 1600;
  const lines = [
    "M 980 720 C 800 680 600 760 380 660",
    "M 300 780 C 520 800 760 860 960 960",
    "M 300 800 C 560 920 520 1250 560 1560",
    "M 700 1560 C 690 1300 670 1060 640 760",
  ];
  // Fine pseudo-random creases give the skin realistic high-frequency texture.
  let seed = 7;
  const rand = () => (seed = (seed * 16807) % 2147483647) / 2147483647;
  const creases = Array.from({ length: 220 }, () => {
    const x = 220 + rand() * 760;
    const y = 520 + rand() * 1000;
    return `<path d="M ${x} ${y} q ${rand() * 40 - 20} ${rand() * 20 - 10} ${rand() * 60 - 30} ${rand() * 30 - 15}" stroke="#8a5a45" stroke-opacity="0.45" stroke-width="1.6" fill="none"/>`;
  }).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="1600" viewBox="0 0 1200 1600">
    <rect width="1200" height="1600" fill="#3b3a40"/>
    <path d="M 260 1600 C 230 1200 200 900 220 520 L 300 120 L 380 520 L 420 60 L 500 520 L 560 90 L 640 520 L 720 200 L 780 560 C 1000 600 1000 1000 900 1600 Z" fill="#d9a184"/>
    ${creases}
    ${lines.map((d) => `<path d="${d}" stroke="#7a4632" stroke-width="7" fill="none" stroke-linecap="round"/>`).join("")}
  </svg>`;
  let image = sharp(Buffer.from(svg)).resize(width, height, { fit: "fill" });
  if (options.brightness !== undefined) image = image.modulate({ brightness: options.brightness });
  if (options.blur) image = image.blur(options.blur);
  const format = options.format ?? "jpeg";
  return image.toFormat(format, format === "jpeg" ? { quality: 90 } : {}).toBuffer();
}
