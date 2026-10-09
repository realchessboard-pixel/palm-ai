/**
 * Collect every translatable English phrase in the app and translate the new
 * ones into every language with Gemini, into src/lib/i18n/phrases/<lang>.json
 * (committed). Re-run after adding or changing text:
 *   npx tsx scripts/translate-phrases.mts            # all languages
 *   npx tsx scripts/translate-phrases.mts hi ta      # some languages
 *   npx tsx scripts/translate-phrases.mts --check    # list missing, no API calls
 *   npx tsx scripts/translate-phrases.mts --prune    # drop unused phrases, no API calls
 * Phrases are found from: <T s="…">, tx("…"), msg("…"), and user-facing
 * error messages (`message: "…"` in src/lib and API routes).
 */
import { readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import ts from "typescript";
import { LANGUAGES } from "../src/lib/i18n/languages";
import { composeRuleBasedReading } from "../src/lib/palmistry/interpretation";
import { sampleAnalysis } from "../src/lib/palmistry/sample-analysis";
import { collectTexts } from "../src/lib/readings/translation-texts";

try {
  process.loadEnvFile(".env");
} catch {
  // CI passes AI_API_KEY directly.
}

const MODEL = process.env.AI_TRANSLATE_MODEL ?? process.env.AI_MODEL ?? "gemini-flash-latest";
const DIR = "src/lib/i18n/phrases";
const BATCH = 60;

function walk(dir: string, out: string[] = []): string[] {
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) {
      if (!/admin|node_modules/.test(name)) walk(p, out);
    } else if (/\.(ts|tsx)$/.test(name) && !/\.test\./.test(name)) out.push(p);
  }
  return out;
}

const MESSAGE_FILES =
  /src\/lib\/http\/errors\.ts|src\/lib\/image\/(quality|client-image)\.ts|src\/lib\/pipeline\/analyze\.ts/;

export function collectPhrases(): Set<string> {
  const phrases = new Set<string>();
  const add = (s: string) => {
    const t = s.replace(/\s+/g, " ").trim();
    if (/[A-Za-z]{2,}/.test(t)) phrases.add(t);
  };
  for (const file of walk("src")) {
    const src = readFileSync(file, "utf8");
    const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);
    const literal = (n: ts.Node | undefined) =>
      n && (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n)) ? n.text : null;
    const serverMessages = /src\/(lib|app\/api)\//.test(file);
    const visit = (n: ts.Node) => {
      // <T s="…" />
      if (ts.isJsxAttribute(n) && n.name.getText() === "s") {
        const tag = n.parent.parent;
        if (
          (ts.isJsxSelfClosingElement(tag) || ts.isJsxOpeningElement(tag)) &&
          tag.tagName.getText() === "T"
        ) {
          const init = n.initializer;
          const v = init && literal(init);
          if (v) add(v);
          // s={cond ? "…" : "…"} — collect every string branch.
          const collect = (e: ts.Node | undefined): void => {
            if (!e) return;
            const lit = literal(e);
            if (lit) add(lit);
            else if (ts.isConditionalExpression(e)) {
              collect(e.whenTrue);
              collect(e.whenFalse);
            } else if (ts.isParenthesizedExpression(e)) collect(e.expression);
          };
          if (init && ts.isJsxExpression(init)) collect(init.expression);
        }
      }
      // tx("…"), msg("…")
      if (ts.isCallExpression(n) && /^(tx|msg)$/.test(n.expression.getText())) {
        const v = literal(n.arguments[0]);
        if (v) add(v);
      }
      // AppError({ message: "…" }) and friends
      if (serverMessages && ts.isPropertyAssignment(n) && n.name.getText() === "message") {
        const v = literal(n.initializer);
        if (v && /\s/.test(v)) add(v);
      }
      // Message tables (errors, photo quality)
      if (
        MESSAGE_FILES.test(file) &&
        (ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n))
      ) {
        if (/^[A-Z].*\s.*[.!?…]$/.test(n.text)) add(n.text);
      }
      ts.forEachChild(n, visit);
    };
    visit(sf);
  }
  // The example reading (/example) is shown translated too.
  for (const text of collectTexts(composeRuleBasedReading(sampleAnalysis("right"))).values())
    for (const paragraph of text.split(/\n{2,}/)) add(paragraph);
  return phrases;
}

const placeholders = (s: string) => (s.match(/\{\w+\}/g) ?? []).sort().join(",");

async function translateBatch(language: string, batch: string[]): Promise<(string | null)[]> {
  const prompt = `Translate each English UI string in this JSON array into ${language}, for an Indian astrology and palm-reading website called AstroVidya. Return a JSON array of the same length and order.
Rules:
- Natural, warm, native wording as used by Indian astrology apps. Short UI labels stay short.
- Keep placeholders like {0}, {1}, {name} exactly as they are (you may move them to fit the grammar).
- Keep "AstroVidya", "₹", "GST", "PDF", "WhatsApp", "UPI", numbers, emoji and symbols (→ › · — …) unchanged.
- Keep Jyotish/palmistry terms (Kundli, Mahakundli, Rashifal, Panchang, Milan, Guna, Koota, dasha, Lagna, Nakshatra, Tithi, Rahu Kaal, rekha, parvat) written in the target script where natural.
- Translate faithfully. NEVER add words meaning accurate, precise, exact, guaranteed, certain, prediction or forecast unless the English says so. "Reading" is not "prediction".
- Legal/privacy text: translate the meaning precisely, no additions.

${JSON.stringify(batch)}`;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const r = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`,
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "x-goog-api-key": process.env.AI_API_KEY!,
          },
          body: JSON.stringify({
            contents: [{ role: "user", parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: "application/json", maxOutputTokens: 30000 },
          }),
        },
      );
      const j = (await r.json()) as {
        candidates?: { content: { parts: { text: string }[] } }[];
        error?: { code: number; message: string };
      };
      if (j.error) throw new Error(`Gemini ${j.error.code}: ${j.error.message.split("\n")[0]}`);
      const text = j.candidates?.[0]?.content.parts.map((p) => p.text).join("");
      const arr = JSON.parse(text!) as unknown[];
      if (!Array.isArray(arr) || arr.length !== batch.length) throw new Error("length mismatch");
      // Drop any translation that lost or invented a placeholder.
      return arr.map((v, i) =>
        typeof v === "string" && v.trim() && placeholders(v) === placeholders(batch[i]!) ? v : null,
      );
    } catch (error) {
      console.warn(`retry ${language} (${(error as Error).message})`);
    }
  }
  return batch.map(() => null);
}

const args = process.argv.slice(2);
const check = args.includes("--check");
// --prune: drop phrases the app no longer uses, without any API calls.
const prune = args.includes("--prune");
const only = args.filter((a) => !a.startsWith("--"));
const phrases = collectPhrases();
console.log(`${phrases.size} phrases in the app`);

const todo = LANGUAGES.filter(
  (l) => l.code !== "en" && (only.length === 0 || only.includes(l.code)),
);
let pending = 0;
await Promise.all(
  todo.map(async (l) => {
    const file = `${DIR}/${l.code}.json`;
    const existing = JSON.parse(readFileSync(file, "utf8")) as Record<string, string>;
    const missing = [...phrases].filter((p) => !existing[p]);
    pending += missing.length;
    if (check) {
      if (missing.length) console.log(`${l.code}: ${missing.length} missing`);
      return;
    }
    for (let i = 0; i < (prune ? 0 : missing.length); i += BATCH) {
      const batch = missing.slice(i, i + BATCH);
      const out = await translateBatch(l.english, batch);
      batch.forEach((p, k) => {
        if (out[k]) existing[p] = out[k]!;
      });
    }
    // Keep only phrases the app still uses, sorted for small diffs.
    const kept = Object.fromEntries(
      Object.keys(existing)
        .filter((k) => phrases.has(k))
        .sort()
        .map((k) => [k, existing[k]!]),
    );
    writeFileSync(file, JSON.stringify(kept, null, 2) + "\n");
    console.log(`${l.code}: ${Object.keys(kept).length}/${phrases.size}`);
  }),
);
if (check && pending) process.exitCode = 1;
