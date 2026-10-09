/**
 * One-off: translate the site's fixed text into every supported language with
 * Gemini, and save it to src/lib/i18n/generated.json (committed). Re-run after
 * changing UI_EN. Usage: AI_API_KEY=… npx tsx scripts/translate-ui.mts
 */
import { readFileSync, writeFileSync } from "node:fs";
import { LANGUAGES } from "../src/lib/i18n/languages";
import { READING_MESSAGES_EN } from "../src/lib/i18n/reading-messages";
import { UI_EN } from "../src/lib/i18n/ui";

const FILE = "src/lib/i18n/generated.json";
const MODEL = process.env.AI_MODEL ?? "gemini-3.8-flash";
const out = JSON.parse(readFileSync(FILE, "utf8")) as {
  ui: Record<string, Record<string, string>>;
  reading: Record<string, unknown>;
};
const BUILT_IN_READING = ["en", "hi", "de", "es", "fr", "pt", "it", "id", "ja", "ko"];

async function translate(language: string, payload: unknown): Promise<unknown> {
  const prompt = `Translate the JSON values (not keys) from English into ${language} for an Indian astrology and palm-reading website called AstroVidya. Natural, warm, native wording as used by Indian astrology apps; keep Sanskrit/Jyotish terms (Kundli, Mahakundli, Rashifal, Panchang, Milan, Guna, dasha, Lagna, rekha, parvat) in the target script where natural. Keep "AstroVidya", "₹", "GST", numbers, "›" and "→" as they are. Translate the meaning faithfully: NEVER add words meaning accurate, precise, exact, guaranteed, certain, prediction or forecast unless the English says so (AstroVidya makes no accuracy claims; "reading" is not "prediction"). Return the same JSON structure only.\n\n${JSON.stringify(payload)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
      {
        method: "POST",
        headers: { "content-type": "application/json", "x-goog-api-key": process.env.AI_API_KEY! },
        body: JSON.stringify({
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 30000 },
        }),
      },
    );
    const j = (await r.json()) as { candidates?: { content: { parts: { text: string }[] } }[] };
    const text = j.candidates?.[0]?.content.parts.map((p) => p.text).join("");
    try {
      return JSON.parse(text!);
    } catch {
      console.warn(`retry ${language}`);
    }
  }
  throw new Error(`failed ${language}`);
}

const todo = LANGUAGES.filter(
  (l) => l.code !== "en" && (process.argv[2] ? l.code === process.argv[2] : true),
);
await Promise.all(
  todo.map(async (l) => {
    const ui = (await translate(l.english, UI_EN)) as Record<string, string>;
    out.ui[l.code] = Object.fromEntries(
      Object.keys(UI_EN)
        .filter((k) => typeof ui[k] === "string")
        .map((k) => [k, ui[k]!]),
    );
    if (!BUILT_IN_READING.includes(l.code))
      out.reading[l.code] = await translate(l.english, READING_MESSAGES_EN);
    console.log("done", l.code, Object.keys(out.ui[l.code]!).length);
  }),
);
writeFileSync(FILE, JSON.stringify(out, null, 1) + "\n");
