import { translatePhrase } from "@/lib/i18n/phrases";
import "server-only";
import { PDFDocument, StandardFonts, rgb, type PDFFont, type PDFPage } from "pdf-lib";
import { siteConfig } from "@/lib/config/site";
import { lineTitle, mountTitle } from "@/lib/i18n/reading-messages";
import { narrativeFor } from "@/lib/readings/narrative-view";
import type { ReadingView } from "@/lib/readings/view";
import { SECTION_IDS } from "@/lib/schemas/palm-interpretation";

/**
 * Builds a downloadable PDF of a FULL (premium) reading. Text only — the
 * palm photo is deliberately not embedded, so the file isn't sensitive biometric data.
 */
const PAGE = { width: 595.28, height: 841.89, margin: 56 };
const INK = rgb(0.13, 0.11, 0.18);
const MUTED = rgb(0.42, 0.39, 0.47);
const GOLD = rgb(0.66, 0.46, 0.17);

/** Standard PDF fonts only cover WinAnsi; map common typography and drop the rest. */
export function toWinAnsi(text: string): string {
  return text
    .replace(/[‘’‛]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/…/g, "...")
    .replace(/ /g, " ")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^\x20-\x7E\n]/g, "");
}

class Writer {
  page: PDFPage;
  y: number;

  constructor(
    private readonly doc: PDFDocument,
    private readonly fonts: { regular: PDFFont; bold: PDFFont; serif: PDFFont },
  ) {
    this.page = this.addPage();
    this.y = PAGE.height - PAGE.margin;
  }

  private addPage(): PDFPage {
    const page = this.doc.addPage([PAGE.width, PAGE.height]);
    page.drawText(toWinAnsi(`${siteConfig.name} - for entertainment and reflection only`), {
      x: PAGE.margin,
      y: 28,
      size: 8,
      font: this.fonts.regular,
      color: MUTED,
    });
    return page;
  }

  private ensure(space: number) {
    if (this.y - space < PAGE.margin) {
      this.page = this.addPage();
      this.y = PAGE.height - PAGE.margin;
    }
  }

  wrap(text: string, font: PDFFont, size: number, width: number): string[] {
    const lines: string[] = [];
    for (const paragraph of toWinAnsi(text).split("\n")) {
      let line = "";
      for (const word of paragraph.split(/\s+/).filter(Boolean)) {
        const candidate = line ? `${line} ${word}` : word;
        if (font.widthOfTextAtSize(candidate, size) > width && line) {
          lines.push(line);
          line = word;
        } else {
          line = candidate;
        }
      }
      lines.push(line);
    }
    return lines;
  }

  text(
    text: string,
    options: {
      size?: number;
      font?: "regular" | "bold" | "serif";
      color?: typeof INK;
      gap?: number;
    } = {},
  ) {
    const size = options.size ?? 10.5;
    const font = this.fonts[options.font ?? "regular"];
    const leading = size * 1.45;
    for (const line of this.wrap(text, font, size, PAGE.width - PAGE.margin * 2)) {
      this.ensure(leading);
      this.page.drawText(line, {
        x: PAGE.margin,
        y: this.y - size,
        size,
        font,
        color: options.color ?? INK,
      });
      this.y -= leading;
    }
    this.y -= options.gap ?? 6;
  }

  heading(text: string) {
    this.ensure(48);
    this.y -= 8;
    this.text(text, { size: 15, font: "serif", color: GOLD, gap: 4 });
  }

  rule() {
    this.ensure(14);
    this.page.drawLine({
      start: { x: PAGE.margin, y: this.y },
      end: { x: PAGE.width - PAGE.margin, y: this.y },
      thickness: 0.6,
      color: rgb(0.85, 0.8, 0.7),
    });
    this.y -= 12;
  }
}

export async function renderReadingPdf(reading: ReadingView): Promise<Uint8Array> {
  const interpretation = reading.interpretation;
  if (!interpretation || !reading.premium)
    throw new Error("Full report requires a premium, completed reading");
  const tx = (english: string) => translatePhrase(reading.language, english);

  const doc = await PDFDocument.create();
  doc.setTitle(`${siteConfig.name} palm reading`);
  doc.setProducer(siteConfig.name);
  doc.setCreator(siteConfig.name);
  const w = new Writer(doc, {
    regular: await doc.embedFont(StandardFonts.Helvetica),
    bold: await doc.embedFont(StandardFonts.HelveticaBold),
    serif: await doc.embedFont(StandardFonts.TimesRoman),
  });

  const { narrative, usedSections } = narrativeFor(interpretation);
  w.text("Your Palm Reading", { size: 26, font: "serif", gap: 2 });
  const date = new Date(reading.createdAt).toLocaleDateString("en", { dateStyle: "long" });
  w.text(`${date} - ${reading.hand === "left" ? "Left" : "Right"} hand - Detailed reading`, {
    color: MUTED,
  });
  if (reading.isDemo)
    w.text(tx("Demo reading generated from sample palm features."), { color: MUTED });
  w.rule();
  w.text(narrative.headline, { size: 17, font: "serif", gap: 8 });
  w.text(narrative.introduction);

  const parts: [string, string | undefined][] = [
    [tx("The way you think"), narrative.thinking?.text],
    [tx("The way you care"), narrative.caring?.text],
  ];
  for (const [title, text] of parts) {
    if (!text) continue;
    w.heading(title);
    w.text(text);
  }
  if (narrative.strengths.length) {
    w.heading(tx("Your natural strengths"));
    for (const strength of narrative.strengths) {
      w.text(strength.name, { font: "bold", gap: 1 });
      w.text(strength.text, { gap: 4 });
    }
  }
  if (narrative.career) {
    w.heading(tx("Your career nature"));
    w.text(narrative.career.text);
  }
  if (narrative.insight) {
    w.heading(tx("Something interesting about you"));
    w.text(narrative.insight.title, { font: "bold", gap: 2 });
    w.text(narrative.insight.text);
  }

  const sections = interpretation.sections
    .filter((s) => !usedSections.includes(s.id))
    .sort((a, b) => SECTION_IDS.indexOf(a.id) - SECTION_IDS.indexOf(b.id));
  if (sections.length || interpretation.lines.length) {
    w.rule();
    w.text(tx("Your detailed reading"), { size: 18, font: "serif", gap: 4 });
  }
  for (const section of sections) {
    w.heading(section.title);
    w.text(section.summary, { font: "bold", gap: 3 });
    if (section.details) w.text(section.details);
    for (const point of section.points) w.text(`- ${point}`, { gap: 1 });
  }

  if (interpretation.lines.length) {
    w.heading(tx("Your major lines"));
    for (const line of interpretation.lines) {
      w.text(lineTitle("en", line.line), { font: "bold", gap: 2 });
      w.text(line.summary, { gap: 2 });
      if (line.details) w.text(line.details, { color: MUTED });
    }
  }

  if (interpretation.mounts.length) {
    w.heading(tx("The parvats (mounts) of your palm"));
    for (const mount of interpretation.mounts) {
      w.text(mountTitle("en", mount.mount), { font: "bold", gap: 2 });
      w.text(`${mount.summary} ${mount.details}`);
    }
  }
  if (interpretation.fingers) {
    w.heading("Fingers & thumb");
    w.text(interpretation.fingers.summary);
    w.text(interpretation.fingers.details, { color: MUTED });
  }
  if (interpretation.markings) {
    w.heading(tx("Special markings"));
    w.text(interpretation.markings.summary);
    w.text(interpretation.markings.details, { color: MUTED });
  }

  w.rule();
  w.text(
    tx(
      "This reading follows traditional Indian palmistry (Hasta Samudrika Shastra). It is a cultural tradition offered for reflection and enjoyment - not a scientific prediction.",
    ),
    { size: 8.5, color: MUTED, gap: 3 },
  );
  w.text(
    `${siteConfig.disclaimer} Readings never include medical, lifespan, pregnancy, legal or guaranteed financial claims.`,
    { size: 8.5, color: MUTED },
  );
  return doc.save();
}
