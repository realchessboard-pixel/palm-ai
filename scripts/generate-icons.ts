/**
 * Regenerate PNG app icons from public/icons/icon.svg:
 *   npm run icons
 */
import { readFile } from "node:fs/promises";
import sharp from "sharp";

const SOURCE = "public/icons/icon.svg";

async function main() {
  const svg = await readFile(SOURCE);
  const sizes: [string, number][] = [
    ["public/icons/icon-192.png", 192],
    ["public/icons/icon-512.png", 512],
    ["public/icons/apple-touch-icon.png", 180],
    ["public/favicon.ico", 48],
  ];
  for (const [file, size] of sizes) {
    await sharp(svg, { density: 384 }).resize(size, size).png().toFile(file);
  }
  // Maskable icon: artwork inside the 80% safe zone on a full-bleed background.
  const inner = await sharp(svg, { density: 384 }).resize(400, 400).png().toBuffer();
  await sharp({ create: { width: 512, height: 512, channels: 4, background: "#07060c" } })
    .composite([{ input: inner, gravity: "centre" }])
    .png()
    .toFile("public/icons/maskable-512.png");
  console.log("Icons generated.");
}

void main();
