/**
 * Codemod: wrap visible JSX text in <T s="…" v={[…]} /> so it is translated.
 * Text mixed with expressions/elements becomes one phrase with {0}, {1}…
 * placeholders, so translators can reorder it naturally.
 * Usage: npx tsx scripts/i18n-wrap.mts <file…>
 * Idempotent: elements whose only child is already <T> are left alone.
 */
import { readFileSync, writeFileSync } from "node:fs";
import ts from "typescript";

const SKIP_ELEMENTS = new Set([
  "option",
  "title",
  "textarea",
  "style",
  "script",
  "T",
  "code",
  "pre",
]);
const ENTITIES: Record<string, string> = {
  "&apos;": "'",
  "&quot;": '"',
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&nbsp;": " ",
  "&rsquo;": "’",
  "&lsquo;": "‘",
  "&ldquo;": "“",
  "&rdquo;": "”",
  "&mdash;": "—",
  "&ndash;": "–",
  "&hellip;": "…",
  "&times;": "×",
  "&rarr;": "→",
  "&middot;": "·",
};

/** Babel's JSX text whitespace rules. */
function cleanJsxText(raw: string): string {
  const lines = raw.split(/\r\n|\n|\r/);
  let lastNonEmpty = 0;
  lines.forEach((l, i) => {
    if (/[^ \t]/.test(l)) lastNonEmpty = i;
  });
  let out = "";
  lines.forEach((line, i) => {
    let t = line.replace(/\t/g, " ");
    if (i !== 0) t = t.replace(/^[ ]+/, "");
    if (i !== lines.length - 1) t = t.replace(/[ ]+$/, "");
    if (t) {
      if (i !== lastNonEmpty) t += " ";
      out += t;
    }
  });
  return out.replace(/&[a-z]+;|&#\d+;/g, (e) =>
    e.startsWith("&#") ? String.fromCharCode(Number(e.slice(2, -1))) : (ENTITIES[e] ?? e),
  );
}

/** Elements inside v={[…]} need a key (they are passed as an array). */
function withKey(code: string, i: number): string {
  if (code.startsWith("<>")) return `<Fragment key={${i}}>` + code.slice(2, -3) + "</Fragment>";
  const m = code.match(/^<([A-Za-z][\w.]*)/);
  if (!m) return code;
  return `<${m[1]} key={${i}}` + code.slice(m[0].length);
}

function tagName(node: ts.JsxElement): string {
  return node.openingElement.tagName.getText();
}

function transform(file: string): boolean {
  const src = readFileSync(file, "utf8");
  const sf = ts.createSourceFile(file, src, ts.ScriptTarget.Latest, true, ts.ScriptKind.TSX);

  type Edit = { start: number; end: number; build: () => string };
  const edits: Edit[] = [];

  function visit(node: ts.Node) {
    if (ts.isJsxElement(node) || ts.isJsxFragment(node)) {
      const name = ts.isJsxElement(node) ? tagName(node) : "";
      const kids = node.children;
      const hasText = kids.some(
        (c) => ts.isJsxText(c) && /[A-Za-z]{2,}/.test(cleanJsxText(c.text)),
      );
      if (hasText && !SKIP_ELEMENTS.has(name) && kids.length > 0) {
        const start = kids[0]!.pos;
        const end = kids[kids.length - 1]!.end;
        edits.push({
          start,
          end,
          build: () => {
            let s = "";
            const values: string[] = [];
            for (const c of kids) {
              if (ts.isJsxText(c)) {
                s += cleanJsxText(c.text);
              } else if (ts.isJsxExpression(c)) {
                if (!c.expression) continue; // {/* comment */}
                const e = c.expression;
                if (ts.isStringLiteral(e) || ts.isNoSubstitutionTemplateLiteral(e)) {
                  s += e.text;
                } else {
                  s += `{${values.length}}`;
                  values.push(withKey(rewrite(e.getStart(), e.end), values.length));
                }
              } else {
                s += `{${values.length}}`;
                values.push(withKey(rewrite(c.getStart(), c.end), values.length));
              }
            }
            s = s.replace(/\s+/g, " ").trim();
            const v = values.length ? ` v={[${values.join(", ")}]}` : "";
            const lit = JSON.stringify(s);
            const attr = lit.includes("\\") ? `{${lit}}` : lit;
            return `<T s=${attr}${v} />`;
          },
        });
      }
    }
    ts.forEachChild(node, visit);
  }
  visit(sf);
  if (edits.length === 0) return false;

  /** Source text of [start, end) with every edit inside it applied (outermost first). */
  function rewrite(start: number, end: number): string {
    const inner = edits
      .filter((e) => e.start >= start && e.end <= end && !(e.start === start && e.end === end))
      .filter((e, _, all) => !all.some((o) => o !== e && o.start <= e.start && o.end >= e.end))
      .sort((a, b) => a.start - b.start);
    let out = "";
    let at = start;
    for (const e of inner) {
      out += src.slice(at, e.start) + e.build();
      at = e.end;
    }
    return out + src.slice(at, end);
  }

  // Top-level edits are those not nested in another edit.
  const top = edits
    .filter((e) => !edits.some((o) => o !== e && o.start <= e.start && o.end >= e.end))
    .sort((a, b) => a.start - b.start);
  let out = "";
  let at = 0;
  for (const e of top) {
    out += src.slice(at, e.start) + e.build();
    at = e.end;
  }
  out += src.slice(at);

  if (!/import \{[^}]*\bT\b[^}]*\} from "@\/components\/i18n\/i18n"/.test(out)) {
    // After "use client" (if any), before the first import.
    const m = out.match(/^(["']use client["'];?\s*\n)?/);
    const head = m?.[0] ?? "";
    out = head + `import { T } from "@/components/i18n/i18n";\n` + out.slice(head.length);
  }
  writeFileSync(file, out);
  return true;
}

let changed = 0;
for (const f of process.argv.slice(2)) if (transform(f)) changed++;
console.log(`wrapped text in ${changed} file(s)`);
